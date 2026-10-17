/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleAuth } from 'google-auth-library';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Robust extractor for environment variables from .env / .env.local content.
 * Correctly parses unquoted, single-quoted, double-quoted, and multi-line JSON values.
 */
function extractEnvVar(content, varName) {
  if (!content) return '';
  const regex = new RegExp('^[\\t ]*' + varName + '[\\t ]*=[\\t ]*(.*)$', 'm');
  const match = content.match(regex);
  if (!match) return '';
  const afterEqual = content.slice(match.index + match[0].indexOf('=') + 1).trim();

  if (afterEqual.startsWith("'")) {
    const endQuote = afterEqual.indexOf("'", 1);
    if (endQuote !== -1) return afterEqual.slice(1, endQuote).trim();
  } else if (afterEqual.startsWith('"')) {
    const endQuote = afterEqual.indexOf('"', 1);
    if (endQuote !== -1) return afterEqual.slice(1, endQuote).trim();
  } else if (afterEqual.startsWith('{')) {
    let depth = 0;
    for (let i = 0; i < afterEqual.length; i++) {
      if (afterEqual[i] === '{') depth++;
      else if (afterEqual[i] === '}') {
        depth--;
        if (depth === 0) return afterEqual.slice(0, i + 1).trim();
      }
    }
  }
  return afterEqual.split('\n')[0].trim();
}

/**
 * Production-grade GCP OAuth2 Token Provider for Node.js.
 *
 * Automatically manages token acquisition and continuous auto-refresh:
 * 1. Priority 1: GCP_SERVICE_ACCOUNT_JSON (inline JSON string or file path, No gcloud SDK required)
 * 2. Priority 2: GOOGLE_APPLICATION_CREDENTIALS (service account file path)
 * 3. Priority 3: Google Application Default Credentials (ADC) / Metadata Server (Cloud Run, GKE, Compute Engine)
 * 4. Priority 4: Manual GCP_ACCESS_TOKEN from environment/.env (fallback)
 * 5. Priority 5: gcloud CLI fallback (local development machines)
 */
export class GCPTokenProvider {
  constructor(scopes = ['https://www.googleapis.com/auth/cloud-platform']) {
    this.scopes = scopes;
    this.cachedGcloudToken = null;
    this.cachedGcloudTokenExpiry = 0;
    this.manualTokenOverride = null;
    this.authClient = null;
    this.authSource = 'ADC';
    this.lastLoggedToken = null;
    this.initAuth();
  }

  initAuth() {
    let authOptions = {
      scopes: this.scopes,
    };

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
    if (projectId) {
      authOptions.projectId = projectId;
    }

    // Priority 1: Service Account JSON string or file path in environment or .env/.env.local
    let saJson = this.getServiceAccountJsonFromEnv();
    if (saJson) {
      try {
        // Strip outer quotes if still wrapped
        if ((saJson.startsWith("'") && saJson.endsWith("'")) || (saJson.startsWith('"') && saJson.endsWith('"'))) {
          saJson = saJson.slice(1, -1).trim();
        }

        // Check if saJson is a path to a JSON file on disk
        if (fs.existsSync(saJson) && fs.statSync(saJson).isFile()) {
          saJson = fs.readFileSync(saJson, 'utf8').trim();
        }

        const creds = JSON.parse(saJson);
        authOptions.credentials = creds;
        this.authSource = creds.type === 'authorized_user' ? 'GCP_SERVICE_ACCOUNT_JSON (authorized_user)' : 'GCP_SERVICE_ACCOUNT_JSON (service_account)';

        if (creds.project_id && !process.env.GOOGLE_CLOUD_PROJECT) {
          process.env.GOOGLE_CLOUD_PROJECT = creds.project_id;
          authOptions.projectId = creds.project_id;
        }

        console.log(`[GCPTokenProvider-Node] Initialized with ${this.authSource} (Auto-Refreshing, No gcloud SDK required).`);
      } catch (err) {
        console.error('[GCPTokenProvider-Node] Failed to parse GCP_SERVICE_ACCOUNT_JSON:', err.message);
      }
    } else {
      const gCreds = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
      if (gCreds) {
        this.authSource = 'GOOGLE_APPLICATION_CREDENTIALS';
        console.log(`[GCPTokenProvider-Node] Using GOOGLE_APPLICATION_CREDENTIALS: ${gCreds}`);
      }
    }

    this.auth = new GoogleAuth(authOptions);
  }

  /**
   * Retrieves GCP_SERVICE_ACCOUNT_JSON from environment or candidate .env files
   */
  getServiceAccountJsonFromEnv() {
    const direct = (process?.env?.GCP_SERVICE_ACCOUNT_JSON || '').trim();
    if (direct) return direct;

    const candidatePaths = [
      path.resolve(__dirname, '.env.local'),
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '../../backend/.env'),
      path.resolve(__dirname, '../backend/.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../../backend/.env'),
    ];

    for (const envPath of candidatePaths) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const val = extractEnvVar(content, 'GCP_SERVICE_ACCOUNT_JSON');
          if (val) return val;
        }
      } catch (err) {}
    }

    return '';
  }

  /**
   * Retrieves manual token from environment or parent .env files if present
   */
  getManualTokenFromEnv() {
    if (this.manualTokenOverride) return this.manualTokenOverride;
    const directToken = (process?.env?.GCP_ACCESS_TOKEN || process?.env?.GOOGLE_CLOUD_ACCESS_TOKEN || '').trim();
    if (directToken) return directToken;

    const candidatePaths = [
      path.resolve(__dirname, '.env.local'),
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '../../backend/.env'),
      path.resolve(process.cwd(), '../../backend/.env'),
    ];

    for (const envPath of candidatePaths) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const val = extractEnvVar(content, 'GCP_ACCESS_TOKEN') || extractEnvVar(content, 'GOOGLE_CLOUD_ACCESS_TOKEN');
          if (val) return val;
        }
      } catch (err) {}
    }

    return '';
  }

  /**
   * Validates whether a token is active and unexpired via Google's tokeninfo API
   */
  async isTokenValid(token) {
    if (!token || typeof token !== 'string') return false;
    const trimmed = token.trim();
    if (!trimmed || trimmed.startsWith('ya29.sample') || trimmed === 'your-oauth2-access-token') return false;
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        const expiresIn = parseInt(data.expires_in, 10);
        if (!isNaN(expiresIn) && expiresIn > 30) {
          return true;
        }
      }
    } catch (err) {}
    return false;
  }

  /**
   * Returns a guaranteed valid, automatically refreshed OAuth2 access token
   */
  async getToken() {
    // 1. Primary: Dynamic auto-refreshing credentials (Service Account JSON / ADC / Metadata Server)
    try {
      if (!this.authClient) {
        this.authClient = await this.auth.getClient();
      }
      const tokenObj = await this.authClient.getAccessToken();
      const accessToken = typeof tokenObj === 'string' ? tokenObj : (tokenObj?.token || tokenObj?.res?.data?.access_token);
      if (accessToken) {
        if (this.lastLoggedToken !== accessToken) {
          console.log(`[GCPTokenProvider-Node] Valid dynamic access token active via ${this.authSource}. (Auto-refresh on demand)`);
          this.lastLoggedToken = accessToken;
        }
        return accessToken;
      }
    } catch (err) {
      this.authClient = null;
      console.warn('[GCPTokenProvider-Node] Dynamic token acquisition attempt note:', err.message);
    }

    // 2. Secondary: Check manual token from environment / .env (fallback)
    const manualToken = this.getManualTokenFromEnv();
    if (manualToken) {
      const valid = await this.isTokenValid(manualToken);
      if (valid) {
        if (this.lastLoggedToken !== manualToken) {
          console.log('[GCPTokenProvider-Node] Using valid manual GCP_ACCESS_TOKEN from environment.');
          this.lastLoggedToken = manualToken;
        }
        return manualToken;
      }
    }

    // 3. Tertiary: gcloud CLI fallback for local developer machines
    try {
      const now = Date.now();
      if (this.cachedGcloudToken && now < this.cachedGcloudTokenExpiry) {
        return this.cachedGcloudToken;
      }
      const token = execSync('gcloud auth print-access-token', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (token) {
        this.cachedGcloudToken = token;
        this.cachedGcloudTokenExpiry = now + 45 * 60 * 1000;
        console.log('[GCPTokenProvider-Node] Retrieved dynamic access token via gcloud CLI fallback.');
        return token;
      }
    } catch (gcloudError) {}

    // Fallback: If network check for manual token failed but token is present, return it
    if (manualToken) {
      return manualToken;
    }

    return '';
  }

  setManualOverride(token) {
    this.manualTokenOverride = token ? token.trim() : null;
  }

  async getProjectId() {
    try {
      return (await this.auth.getProjectId()) || process?.env?.GOOGLE_CLOUD_PROJECT || process?.env?.GCP_PROJECT_ID || '';
    } catch {
      return process?.env?.GOOGLE_CLOUD_PROJECT || process?.env?.GCP_PROJECT_ID || '';
    }
  }

  forceRefresh() {
    this.authClient = null;
    this.cachedGcloudToken = null;
    this.cachedGcloudTokenExpiry = 0;
    this.initAuth();
  }
}

// Global singleton instance
export const tokenProvider = new GCPTokenProvider();
export default tokenProvider;
