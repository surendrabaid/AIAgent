import { Subject } from '../types';

export const CURRICULUM_DATA: Subject[] = [
  {
    id: 'biography',
    name: 'Inspiring Lives & Pioneers',
    icon: 'Sparkles',
    color: 'from-amber-500 to-rose-500',
    description: 'Learn life wisdom, scientific courage, and leadership from world-changing visionaries.',
    chapters: [
      {
        id: 'abdul-kalam-story',
        subjectId: 'biography',
        title: 'Wings of Fire: Story of Dr. A.P.J. Abdul Kalam',
        gradeLevel: 'All Ages / Inspiring Journey',
        summary: 'From selling newspapers in Rameswaram to leading India\'s aerospace breakthroughs and becoming the beloved People\'s President.',
        objectives: [
          'Trace Dr. Kalam\'s early resilience and humble beginnings in Rameswaram',
          'Understand his leadership in SLV-3, Agni, and Indian aerospace breakthroughs',
          'Explore his vision for youth, India 2020, and lessons on turning failure into triumph'
        ],
        keyConcepts: [
          {
            title: 'Humble Roots & Perseverance in Rameswaram',
            summary: 'Born in 1931 into a modest family in Rameswaram, Tamil Nadu, Kalam distributed newspapers as a young schoolboy while nurturing an ardent passion for flight and aeronautics.',
            example: 'Facing rejection when placed 9th for 8 IAF fighter pilot slots, he transformed heartbreak into groundbreaking aeronautical engineering at DRDO and ISRO.'
          },
          {
            title: 'Leadership: Absorbing Failure, Sharing Success',
            summary: 'Leading India\'s first Satellite Launch Vehicle (SLV-3), Kalam learned indelible leadership from mentor Prof. Satish Dhawan.',
            example: 'When SLV-3 failed into the sea in 1979, Dhawan faced the press alone. When it soared successfully in 1980, Dhawan put Kalam on stage to receive the accolades.'
          },
          {
            title: 'Wings of Fire & Dream Big Philosophy',
            summary: 'Kalam believed that youth are the nation\'s greatest resource and dedicated his life to empowering students to dream without fear of failure.',
            example: '"Dream, dream, dream. Dreams transform into thoughts, and thoughts result in action. Real dreams are those that don\'t let you sleep."'
          },
          {
            title: 'The People\'s President & Eternal Teacher',
            summary: 'Serving as the 11th President of India (2002–2007), he opened the presidential palace to children and chose to spend his final moments doing what he loved most: teaching students at IIM Shillong.'
          }
        ],
        quickPrompts: [
          "Tell me how Dr. Kalam overcame failure during the SLV-3 rocket launch.",
          "What did Dr. Kalam mean by: 'Dreams are not what you see in sleep, but what don't let you sleep'?",
          "How did Dr. Kalam's childhood in Rameswaram shape his humility and determination?",
          "Give me an interactive quiz on Dr. Kalam's life and leadership lessons!"
        ],
        quiz: [
          {
            id: 'ak-1',
            question: "Where did Dr. A.P.J. Abdul Kalam spend his childhood, and what was his early job to support his family?",
            options: [
              "Kolkata, working in a textile mill",
              "Rameswaram, distributing newspapers as a young schoolboy",
              "New Delhi, delivering telegraphs for the post office",
              "Bengaluru, assisting at a weather observatory"
            ],
            correctIndex: 1,
            hint: "He grew up in a coastal temple town in Tamil Nadu and collected newspapers from early morning trains.",
            explanation: "Born in Rameswaram, Tamil Nadu, young Kalam collected and distributed newspapers at dawn to help his family while passionately studying mathematics and science."
          },
          {
            id: 'ak-2',
            question: "What profound leadership lesson did Dr. Kalam learn from ISRO Chairman Prof. Satish Dhawan during the 1979 SLV-3 mission?",
            options: [
              "Leaders should cancel difficult missions at the first technical warning",
              "Leaders must take responsibility for failures, but give credit to their team for successes",
              "Technical problems should always be concealed from the public",
              "Scientists should only work alone without delegation"
            ],
            correctIndex: 1,
            hint: "Think about who took the microphone before reporters when the rocket crashed versus when it succeeded the next year.",
            explanation: "When the 1979 SLV-3 mission failed into the Bay of Bengal, Prof. Dhawan faced the press alone and absorbed all blame. When the launch succeeded in 1980, Dhawan pushed Kalam forward to receive the credit, teaching him how true leaders handle failure and success."
          },
          {
            id: 'ak-3',
            question: "Which highest civilian honor of India was conferred upon Dr. Kalam in 1997 for his transformative scientific leadership?",
            options: [
              "Padma Shri",
              "Param Vir Chakra",
              "Bharat Ratna",
              "Khel Ratna"
            ],
            correctIndex: 2,
            hint: "It is the premier civilian decoration of the Republic of India.",
            explanation: "Dr. Kalam was awarded the Bharat Ratna in 1997, honoring his pivotal contributions to aerospace, indigenous missile development, and national defense science."
          },
          {
            id: 'ak-4',
            question: "What memorable quote about 'Dreams' did Dr. Kalam instill in youth and students around the world?",
            options: [
              "'Dreams are pleasant stories our subconscious tells us at night'",
              "'Dreams are not what you see while sleeping; dreams are something that does not let you sleep'",
              "'Dreams only come true if you are born into immense wealth'",
              "'Dreams should be forgotten as soon as morning arrives'"
            ],
            correctIndex: 1,
            hint: "It highlights intense dedication and waking passion toward meaningful goals.",
            explanation: "Dr. Kalam famously taught: 'Dream is not that which you see while sleeping; it is something that does not let you sleep'—urging youth to pursue their aspirations with relentless dedication."
          }
        ]
      }
    ]
  },
  {
    id: 'physics',
    name: 'Physics & Mechanics',
    icon: 'Atom',
    color: 'from-blue-500 to-cyan-500',
    description: 'Understand the fundamental forces and laws that shape our universe.',
    chapters: [
      {
        id: 'newtons-laws',
        subjectId: 'physics',
        title: "Newton's Laws of Motion & Forces",
        gradeLevel: 'High School / Intro College',
        summary: 'Explore inertia, F=ma, and action-reaction pairs governing mechanical interactions.',
        objectives: [
          'Master inertia and how mass affects resistance to motion',
          'Calculate force, acceleration, and net force (F = m × a)',
          'Distinguish between balanced forces and action-reaction pairs'
        ],
        keyConcepts: [
          {
            title: '1st Law: Law of Inertia',
            summary: 'An object remains at rest or in uniform motion unless acted upon by a non-zero net external force.',
            example: 'A passenger lunges forward when a bus suddenly hits the brakes.'
          },
          {
            title: '2nd Law: F = m · a',
            summary: 'The acceleration of an object is directly proportional to net force and inversely proportional to its mass.',
            formula: 'F_{net} = m \\cdot a'
          },
          {
            title: '3rd Law: Action & Reaction',
            summary: 'For every action, there is an equal and opposite reaction acting on two different bodies simultaneously.',
            example: 'Rocket engines expel exhaust gases downward to propel the rocket upward.'
          }
        ],
        quickPrompts: [
          "Explain Newton's 3rd Law using the example of walking or jumping.",
          "Quiz me on how friction changes net force in F=ma.",
          "Why doesn't the moon fall into the Earth if gravity pulls on it?",
          "Can you give me a real-world puzzle problem about balanced forces?"
        ],
        quiz: [
          {
            id: 'nl-1',
            question: "If net force on an object is zero, what can you conclude about its motion?",
            options: [
              "It must be completely stationary at rest",
              "It moves with constant velocity (which may be zero)",
              "It is accelerating at 9.8 m/s²",
              "Its velocity must be increasing linearly"
            ],
            correctIndex: 1,
            hint: "Recall Newton's 1st Law: an object in motion stays in uniform motion unless a net force intervenes.",
            explanation: "Newton's first law defines inertia: zero net force means acceleration is 0, so velocity is constant (a resting object has constant velocity = 0)."
          },
          {
            id: 'nl-2',
            question: "A 5 kg block is accelerated across a frictionless surface at 3 m/s². What is the net force applied?",
            options: ["1.67 N", "8 N", "15 N", "45 N"],
            correctIndex: 2,
            hint: "Use the formula F = m × a.",
            explanation: "According to Newton's 2nd Law, F = m × a = 5 kg × 3 m/s² = 15 Newtons."
          },
          {
            id: 'nl-3',
            question: "A swimmer pushes backward against the water to propel forward. Which law of motion directly explains this?",
            options: [
              "Newton's 1st Law (Inertia)",
              "Newton's 2nd Law (F = ma)",
              "Newton's 3rd Law (Action-Reaction)",
              "Law of Universal Gravitation"
            ],
            correctIndex: 2,
            hint: "The swimmer exerts force on the water, and the water simultaneously exerts force on the swimmer.",
            explanation: "Action-reaction pair: swimmer exerts force on water (action); water exerts equal magnitude opposite force pushing swimmer forward (reaction)."
          },
          {
            id: 'nl-4',
            question: "If the mass of an accelerating cart is tripled while the net force remains constant, what happens to acceleration?",
            options: [
              "It triples",
              "It reduces to one-third (1/3 a)",
              "It remains identical",
              "It drops to one-ninth (1/9 a)"
            ],
            correctIndex: 1,
            hint: "Rearrange F = m × a to solve for acceleration: a = F / m.",
            explanation: "Since a = F/m, acceleration is inversely proportional to mass. Tripling the mass reduces acceleration to 1/3 of its original value."
          }
        ]
      },
      {
        id: 'work-energy',
        subjectId: 'physics',
        title: 'Work, Kinetic & Potential Energy',
        gradeLevel: 'High School',
        summary: 'Understand work, conservation of mechanical energy, and power transfers.',
        objectives: [
          'Differentiate kinetic (motion) and gravitational potential energy',
          'Apply the Law of Conservation of Energy (E_initial = E_final)',
          'Calculate Work done by a force over distance: W = F × d × cos(θ)'
        ],
        keyConcepts: [
          {
            title: 'Kinetic Energy (KE)',
            summary: 'Energy possessed by an object due to its motion.',
            formula: 'KE = \\frac{1}{2} m v^2'
          },
          {
            title: 'Gravitational Potential Energy (PE)',
            summary: 'Stored energy based on an object’s height in a gravitational field.',
            formula: 'PE = m \\cdot g \\cdot h'
          },
          {
            title: 'Conservation of Energy',
            summary: 'Energy can neither be created nor destroyed, only transformed from one form to another.',
            example: 'A roller coaster trades potential energy at the peak for maximum kinetic energy at the drop.'
          }
        ],
        quickPrompts: [
          "Explain how a roller coaster conserves total mechanical energy.",
          "If I double my car's speed, why does braking distance quadruple?",
          "Give me an intuitive breakdown of Work vs Power.",
          "Walk me through a practice problem on energy conservation."
        ],
        quiz: [
          {
            id: 'we-1',
            question: "If a sports car doubles its velocity from 30 km/h to 60 km/h, what happens to its kinetic energy?",
            options: ["It doubles", "It triples", "It quadruples (4x)", "It increases by 8x"],
            correctIndex: 2,
            hint: "Check the exponent on velocity in KE = 0.5 * m * v².",
            explanation: "Because KE is proportional to the square of velocity (v²), doubling velocity results in (2)² = 4 times the kinetic energy, requiring 4x the stopping distance."
          },
          {
            id: 'we-2',
            question: "A student holds a heavy 20 kg backpack completely still for 10 minutes. How much mechanical Work is done on the backpack?",
            options: ["0 Joules", "196 Joules", "2000 Joules", "Depends on gravity"],
            correctIndex: 0,
            hint: "Mechanical work requires displacement: W = F × d × cos(θ).",
            explanation: "Even though physical fatigue occurs in muscles, mechanical Work is defined as Force × Displacement. With displacement d = 0, Work done is exactly 0 Joules."
          },
          {
            id: 'we-3',
            question: "A 2 kg ball is dropped from a height of 5 meters (take g = 9.8 m/s²). Neglecting air drag, what is its potential energy just before release?",
            options: ["10 J", "49 J", "98 J", "196 J"],
            correctIndex: 2,
            hint: "PE = m × g × h.",
            explanation: "PE = 2 kg × 9.8 m/s² × 5 m = 98 Joules. At the ground, all 98 J converts to kinetic energy."
          },
          {
            id: 'we-4',
            question: "What is the physical rate at which energy is transformed or work is performed called?",
            options: ["Momentum", "Torque", "Power", "Impulse"],
            correctIndex: 2,
            hint: "Measured in Watts (Joules per second).",
            explanation: "Power is defined as Work divided by time (P = W/t), representing the rate of energy transfer."
          }
        ]
      }
    ]
  },
  {
    id: 'math',
    name: 'Mathematics',
    icon: 'Calculator',
    color: 'from-emerald-500 to-teal-500',
    description: 'Build sharp problem-solving intuition from Algebra to Calculus.',
    chapters: [
      {
        id: 'quadratic-equations',
        subjectId: 'math',
        title: 'Quadratic Equations & Parabolas',
        gradeLevel: 'Grade 9-11',
        summary: 'Master factoring, vertex form, completing the square, and the quadratic formula.',
        objectives: [
          'Solve quadratics by factoring and using the quadratic formula',
          'Interpret the discriminant (b² - 4ac) to determine root types',
          'Graph parabolas identifying vertex, axis of symmetry, and intercepts'
        ],
        keyConcepts: [
          {
            title: 'Quadratic Formula',
            summary: 'Solves any standard quadratic equation ax² + bx + c = 0.',
            formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
          },
          {
            title: 'The Discriminant (Δ)',
            summary: 'Determines the nature of roots. Δ > 0: two real roots; Δ = 0: one repeated root; Δ < 0: two complex roots.',
            formula: '\\Delta = b^2 - 4ac'
          },
          {
            title: 'Vertex Form',
            summary: 'Reveals the exact turning point (h, k) and vertical stretch a of the parabola.',
            formula: 'y = a(x - h)^2 + k'
          }
        ],
        quickPrompts: [
          "Why does the quadratic formula work? Can you explain completing the square simply?",
          "How do I quickly find the vertex of a parabola?",
          "Quiz me on finding the discriminant and what it means.",
          "Give me a real world example of a quadratic in projectile motion."
        ],
        quiz: [
          {
            id: 'qe-1',
            question: "What does a negative discriminant (b² - 4ac < 0) indicate about the graph of a parabola y = ax² + bx + c?",
            options: [
              "The vertex sits at the origin (0, 0)",
              "The parabola never intersects or crosses the x-axis",
              "The parabola must always open downward",
              "It possesses exactly two integer roots"
            ],
            correctIndex: 1,
            hint: "Real roots correspond to x-intercepts on the Cartesian plane.",
            explanation: "When b² - 4ac < 0, the quadratic formula yields the square root of a negative number (imaginary roots). Therefore, the curve never crosses the real x-axis."
          },
          {
            id: 'qe-2',
            question: "What is the vertex of the parabola described by the equation y = 2(x - 3)² + 5?",
            options: ["(-3, 5)", "(3, 5)", "(3, -5)", "(-3, -5)"],
            correctIndex: 1,
            hint: "Compare with vertex form y = a(x - h)² + k where vertex is (h, k).",
            explanation: "In vertex form y = a(x - h)² + k, h = 3 and k = 5, making the vertex (3, 5)."
          },
          {
            id: 'qe-3',
            question: "What are the roots of the quadratic equation x² - 5x + 6 = 0?",
            options: ["x = -2, -3", "x = 2, 3", "x = 1, 6", "x = -1, -6"],
            correctIndex: 1,
            hint: "Find two numbers that multiply to +6 and add up to -5.",
            explanation: "Factoring yields (x - 2)(x - 3) = 0. Setting each factor to zero gives x = 2 and x = 3."
          },
          {
            id: 'qe-4',
            question: "For the equation 2x² - 4x + 2 = 0, calculate the discriminant Δ = b² - 4ac and identify the number of real solutions.",
            options: [
              "Δ = 32 (two distinct real roots)",
              "Δ = -16 (two complex roots)",
              "Δ = 0 (exactly one real repeated root)",
              "Δ = 4 (two rational roots)"
            ],
            correctIndex: 2,
            hint: "Calculate (-4)² - 4(2)(2).",
            explanation: "b² - 4ac = (-4)² - 4(2)(2) = 16 - 16 = 0. A discriminant of zero means the parabola's vertex touches the x-axis at exactly one point (x = 1)."
          }
        ]
      },
      {
        id: 'calculus-derivatives',
        subjectId: 'math',
        title: 'Calculus: Derivatives & Rates of Change',
        gradeLevel: 'Advanced / College',
        summary: 'Discover instantaneous rate of change, tangent slopes, and the power rule.',
        objectives: [
          'Understand derivative as the limit of difference quotient',
          'Master power, product, and quotient rules',
          'Apply derivatives to optimization (maxima and minima problems)'
        ],
        keyConcepts: [
          {
            title: 'Definition of Derivative',
            summary: 'Slope of tangent line as secant interval approaches zero.',
            formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"
          },
          {
            title: 'Power Rule',
            summary: 'Differentiating polynomial terms easily.',
            formula: "\\frac{d}{dx}[x^n] = n \\cdot x^{n-1}"
          }
        ],
        quickPrompts: [
          "Explain the difference between average velocity and instantaneous velocity.",
          "How do derivatives help businesses maximize profits or minimize costs?",
          "Give me a step-by-step walk-through of the product rule.",
          "Quiz me on differentiating polynomial functions."
        ],
        quiz: [
          {
            id: 'cd-1',
            question: "What is the derivative of the polynomial function f(x) = 4x³ - 5x + 7?",
            options: ["12x² - 5", "12x³ - 5", "4x² - 5", "12x² - 5x"],
            correctIndex: 0,
            hint: "Apply the power rule d/dx[xⁿ] = n·xⁿ⁻¹ to each term. Constants become 0.",
            explanation: "d/dx[4x³] = 12x², d/dx[-5x] = -5, and d/dx[7] = 0. Combining terms gives 12x² - 5."
          },
          {
            id: 'cd-2',
            question: "At a local maximum or minimum of a smooth differentiable curve, what must the first derivative f'(x) equal?",
            options: ["1", "-1", "0", "Undefined"],
            correctIndex: 2,
            hint: "Consider the slope of the horizontal tangent line at the peak or valley.",
            explanation: "Fermat's Theorem: At an interior local extremum of a differentiable function, the slope of the tangent line is horizontal, meaning f'(x) = 0."
          },
          {
            id: 'cd-3',
            question: "What is the derivative of f(x) = e^(2x)?",
            options: ["e^(2x)", "2e^(2x)", "2xe^(2x)", "e^(2x) / 2"],
            correctIndex: 1,
            hint: "Use the chain rule: d/dx[e^(u)] = e^(u) · u'.",
            explanation: "By chain rule, derivative of e^(2x) is e^(2x) multiplied by the derivative of the inner exponent 2x (which is 2), giving 2e^(2x)."
          },
          {
            id: 'cd-4',
            question: "If position is represented by s(t) = t² + 4t, what is the instantaneous velocity at t = 3 seconds?",
            options: ["7 m/s", "10 m/s", "12 m/s", "21 m/s"],
            correctIndex: 1,
            hint: "Velocity is the first derivative of position: v(t) = s'(t).",
            explanation: "v(t) = s'(t) = 2t + 4. At t = 3: v(3) = 2(3) + 4 = 6 + 4 = 10 m/s."
          }
        ]
      }
    ]
  },
  {
    id: 'biology',
    name: 'Biology & Life Sciences',
    icon: 'Dna',
    color: 'from-green-500 to-emerald-600',
    description: 'Explore the mechanisms of cellular life, DNA replication, and human physiology.',
    chapters: [
      {
        id: 'cell-respiration',
        subjectId: 'biology',
        title: 'Cellular Respiration & Photosynthesis',
        gradeLevel: 'High School Biology',
        summary: 'How cells convert glucose into ATP energy and how plants harness sunlight.',
        objectives: [
          'Trace the stages of respiration: Glycolysis, Krebs Cycle, and Electron Transport Chain',
          'Understand the role of ATP synthase and proton gradients',
          'Compare aerobic vs. anaerobic fermentation'
        ],
        keyConcepts: [
          {
            title: 'Overall Respiration Equation',
            summary: 'Glucose and oxygen convert into carbon dioxide, water, and usable ATP currency.',
            formula: 'C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + ~32 ATP'
          },
          {
            title: 'Mitochondria: ATP Factory',
            summary: 'The inner membrane cristae houses the electron transport chain pumping protons across the gradient.',
            example: 'Cyanide acts by blocking Cytochrome c oxidase in the ETC, halting ATP generation.'
          }
        ],
        quickPrompts: [
          "Explain the role of ATP as the energy currency of our cells.",
          "What is the difference between Glycolysis and the Krebs Cycle?",
          "Why do our muscles burn during intense sprint exercises?",
          "Quiz me on cellular respiration vs photosynthesis."
        ],
        quiz: [
          {
            id: 'cr-1',
            question: "In which region of an animal eukaryotic cell does Glycolysis occur?",
            options: [
              "Mitochondrial matrix",
              "Cytoplasm (Cytosol)",
              "Inner mitochondrial membrane",
              "Nucleolus"
            ],
            correctIndex: 1,
            hint: "This initial stage does not require oxygen and happens outside the mitochondria.",
            explanation: "Glycolysis breaks 1 glucose into 2 pyruvate molecules within the cytosol (cytoplasm) before products enter mitochondria."
          },
          {
            id: 'cr-2',
            question: "Which stage of aerobic cellular respiration generates the greatest amount of ATP molecules (roughly 28-32)?",
            options: [
              "Glycolysis",
              "Pyruvate Oxidation",
              "Krebs Cycle (Citric Acid Cycle)",
              "Oxidative Phosphorylation (Electron Transport Chain)"
            ],
            correctIndex: 3,
            hint: "Powered by proton motive force spinning ATP Synthase.",
            explanation: "The Electron Transport Chain and chemiosmosis produce the vast majority of ATP (~28-32 ATP) via oxidative phosphorylation."
          },
          {
            id: 'cr-3',
            question: "What serves as the final electron acceptor at the end of the mitochondrial electron transport chain?",
            options: ["Carbon dioxide (CO₂)", "Oxygen (O₂)", "Glucose", "Water (H₂O)"],
            correctIndex: 1,
            hint: "It binds electrons and hydrogen ions to form water.",
            explanation: "Molecular oxygen (O₂) is the terminal electron acceptor. It picks up electrons and protons to form benign water (H₂O)."
          },
          {
            id: 'cr-4',
            question: "When oxygen levels are depleted during intense sprint exercise, human muscle cells produce which compound to regenerate NAD+?",
            options: ["Ethanol", "Lactic Acid (Lactate)", "Acetyl CoA", "Citrate"],
            correctIndex: 1,
            hint: "Associated with temporary muscle soreness and oxygen debt.",
            explanation: "In anaerobic conditions, human cells perform lactic acid fermentation, reducing pyruvate to lactate to regenerate NAD+ so glycolysis can continue."
          }
        ]
      }
    ]
  },
  {
    id: 'cs',
    name: 'Computer Science & AI',
    icon: 'Code',
    color: 'from-purple-500 to-indigo-600',
    description: 'Learn computational thinking, algorithms, data structures, and how modern AI works.',
    chapters: [
      {
        id: 'algorithms-big-o',
        subjectId: 'cs',
        title: 'Algorithms & Big-O Time Complexity',
        gradeLevel: 'Intro CS / AP CS',
        summary: 'Analyze how algorithms scale in time and memory as input size grows.',
        objectives: [
          'Distinguish O(1), O(log n), O(n), O(n log n), and O(n²)',
          'Compare Linear Search vs. Binary Search',
          'Understand space vs. time trade-offs in data structures'
        ],
        keyConcepts: [
          {
            title: 'Binary Search: O(log n)',
            summary: 'Halves the search space every comparison on sorted datasets.',
            example: 'Finding a word in a 1,000,000 page dictionary takes at most ~20 comparisons.'
          },
          {
            title: 'Nested Loops: O(n²)',
            summary: 'Quadratic explosion where operations scale with the square of inputs.',
            example: 'Comparing every student against every other student in a classroom.'
          }
        ],
        quickPrompts: [
          "Explain Big-O complexity using a simple analogy like finding a book in a library.",
          "Why is Binary Search faster than Linear Search?",
          "Quiz me on classifying code snippets into Big-O complexities.",
          "How do hash tables achieve average O(1) lookups?"
        ],
        quiz: [
          {
            id: 'cs-1',
            question: "What is the worst-case time complexity of searching a sorted array with Binary Search?",
            options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
            correctIndex: 2,
            hint: "The algorithm divides the remaining search interval by half each step.",
            explanation: "Binary search repeatedly divides the search range in half, giving a logarithmic worst-case time complexity of O(log n)."
          },
          {
            id: 'cs-2',
            question: "Two nested loops both iterating from 0 to n perform a constant-time operation inside. What is the Big-O time complexity?",
            options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
            correctIndex: 2,
            hint: "If n = 1000, the inner loop runs 1000 × 1000 = 1,000,000 times.",
            explanation: "For every one of the n iterations of the outer loop, the inner loop executes n times, totaling n × n = n² operations (Quadratic Time: O(n²))."
          },
          {
            id: 'cs-3',
            question: "What is the average time complexity for key lookups and insertions in an efficient Hash Table (Hash Map)?",
            options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            correctIndex: 0,
            hint: "Hash functions compute direct memory index offsets.",
            explanation: "Hash maps compute an array index via a hash function, allowing instant O(1) constant-time access on average."
          },
          {
            id: 'cs-4',
            question: "Which of the following sorting algorithms guarantees an optimal O(n log n) worst-case time complexity?",
            options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Quick Sort (naive pivot)"],
            correctIndex: 2,
            hint: "Uses a divide-and-conquer strategy that always divides the list evenly.",
            explanation: "Merge Sort recursively splits the array in half (log n levels) and takes linear O(n) work to merge each level, guaranteeing O(n log n) even in the worst case."
          }
        ]
      }
    ]
  }
];
