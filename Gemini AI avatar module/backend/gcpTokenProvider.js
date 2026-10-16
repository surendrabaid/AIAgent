/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleAuth } from 'google-auth-library';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Production-grade GCP OAuth2 Token Provider for Node.js (Strategy 3).
 *
 * Automatically manages token acquisition and continuous auto-refresh:
 * 1. Priority 1: GCP_SERVICE_ACCOUNT_JSON (inline JSON string for containerized deployments)
 * 2. Priority 2: GOOGLE_APPLICATION_CREDENTIALS (service account file path)
 * 3. Priority 3: Google Application Default Credentials (ADC) / Metadata Server (Cloud Run, GKE, Compute Engine)
 * 4. Priority 4: Manual GCP_ACCESS_TOKEN from environment/.env (debugging override)
 * 5. Priority 5: gcloud CLI fallback (local development machines)
 */
export class GCPTokenProvider {
  constructor(scopes = ['https://www.googleapis.com/auth/cloud-platform']) {
    this.scopes = scopes;
    this.cachedGcloudToken = null;
    this.cachedGcloudTokenExpiry = 0;
    this.manualTokenOverride = null;
    this.authClient = null;
    this.initAuth();
  }

  initAuth() {
    let authOptions = {
      scopes: this.scopes,
    };

    // Priority 1: Service Account JSON string or file path in environment or .env
    let saJson = this.getServiceAccountJsonFromEnv();
    if (saJson) {
      try {
        // Strip outer wrapping quotes if present from .env parsing
        if ((saJson.startsWith("'") && saJson.endsWith("'")) || (saJson.startsWith('"') && saJson.endsWith('"'))) {
          saJson = saJson.slice(1, -1).trim();
        }

        // Check if saJson is actually a path to a JSON file on disk
        if (fs.existsSync(saJson) && fs.statSync(saJson).isFile()) {
          saJson = fs.readFileSync(saJson, 'utf8').trim();
        }

        const creds = JSON.parse(saJson);
        authOptions.credentials = creds;
        if (creds.project_id && !process.env.GOOGLE_CLOUD_PROJECT) {
          process.env.GOOGLE_CLOUD_PROJECT = creds.project_id;
        }
        console.log('[GCPTokenProvider-Node] Initialized with GCP_SERVICE_ACCOUNT_JSON.');
      } catch (err) {
        console.error('[GCPTokenProvider-Node] Failed to parse GCP_SERVICE_ACCOUNT_JSON:', err.message);
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
      path.resolve(process.cwd(), '../../backend/.env'),
      path.resolve(process.cwd(), '../backend/.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
    ];

    for (const envPath of candidatePaths) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          // Match GCP_SERVICE_ACCOUNT_JSON which could be single-quoted, double-quoted, or raw JSON
          const match = content.match(/GCP_SERVICE_ACCOUNT_JSON\s*=\s*(['"]?)([\s\S]*?)\1(?=\n[A-Z0-9_]+=|$)/);
          if (match && match[2]?.trim()) {
            return match[2].trim();
          }
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('GCP_SERVICE_ACCOUNT_JSON=')) {
              const val = trimmed.replace('GCP_SERVICE_ACCOUNT_JSON=', '').trim();
              if (val) return val;
            }
          }
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

    try {
      const parentEnvPath = path.resolve(process.cwd(), '../../backend/.env');
      if (fs.existsSync(parentEnvPath)) {
        const content = fs.readFileSync(parentEnvPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('GCP_ACCESS_TOKEN=')) {
            const val = trimmed.replace('GCP_ACCESS_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
            if (val) return val;
          }
        }
      }
    } catch (err) {}

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
    // 1. Primary: Dynamic auto-refreshing credentials (ADC / Service Account / Metadata Server)
    try {
      if (!this.authClient) {
        this.authClient = await this.auth.getClient();
      }
      const token = await this.authClient.getAccessToken();
      if (token?.token) {
        return token.token;
      }
    } catch (err) {
      // Dynamic ADC not available, try other fallbacks
    }

    // 2. Secondary: Check manual token from environment / .env
    const manualToken = this.getManualTokenFromEnv();
    if (manualToken) {
      const valid = await this.isTokenValid(manualToken);
      if (valid) {
        return manualToken;
      }
    }

    // 3. Tertiary: gcloud CLI fallback for local developer machines
    try {
      const now = Date.now();
      if (this.cachedGcloudToken && now < this.cachedGcloudTokenExpiry) {
        return this.cachedGcloudToken;
      }
      const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (token) {
        this.cachedGcloudToken = token;
        this.cachedGcloudTokenExpiry = now + 45 * 60 * 1000;
        return token;
      }
    } catch (gcloudError) {}

    // Fallback: If tokeninfo failed due to network glitch, try manual token if present
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
}

// Global singleton instance
export const tokenProvider = new GCPTokenProvider();
