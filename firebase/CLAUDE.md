# CLAUDE.md - Auto Lead Warmer Firebase Backend

> **Documentation Version**: 2.0
> **Last Updated**: 2025-09-22
> **Project**: Auto Lead Warmer - Firebase Functions Backend
> **Description**: AI-driven lead analysis and content generation backend services
> **Features**: Multi-LLM API integration, user management, token tracking, decoupling architecture

This file provides essential guidance to Claude Code (claude.ai/code) when working with the Firebase Functions backend of the Auto Lead Warmer system.

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**
> **Claude Code must explicitly acknowledge these rules at task start**
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 **RULE ACKNOWLEDGMENT REQUIRED**
> **Before starting ANY task, Claude Code must respond with:**
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS
- **NEVER** create new files in root directory → use proper module structure
- **NEVER** write output files directly to root directory → use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (service_v2.js, enhanced_xyz.js, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead
- **NEVER** create tightly coupled modules → always design for decoupling
- **NEVER** leave dead code → remove unused functions after changes
- **NEVER** hardcode API keys → use environment variables and Firebase config

### 📝 MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit to maintain backup: `git push origin main`
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept
- **DECOUPLING** - Design all modules with clear interfaces and minimal dependencies
- **CODE CLEANUP** - After changes, verify and remove any unused functions/imports
- **ENVIRONMENT VARIABLES** - All API keys and secrets must use Firebase config
- **ERROR HANDLING** - Comprehensive error handling for all API calls and operations

### ⚡ EXECUTION PATTERNS
- **PARALLEL TASK AGENTS** - Launch multiple Task agents simultaneously for maximum efficiency
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → Test validation
- **GITHUB BACKUP WORKFLOW** - After every commit: `git push origin main` to maintain GitHub backup
- **BACKGROUND PROCESSING** - ONLY Task agents can run true background operations

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK
> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**
- [ ] Will this create files in root? → If YES, use proper module structure instead
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Decoupling Verification**
- [ ] Does this create tight coupling between modules? → If YES, add abstraction layer
- [ ] Are dependencies clearly defined? → If NO, create proper interfaces
- [ ] Can this module be tested in isolation? → If NO, reduce dependencies
- [ ] Am I directly accessing external APIs? → If YES, wrap in service layer

**Step 5: Code Cleanup Planning**
- [ ] What functions might become unused after this change?
- [ ] Are there imports that will no longer be needed?
- [ ] Can any existing code be simplified or removed?
- [ ] Will this change make any utility functions obsolete?

**Step 6: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

---

## 📋 PROJECT OVERVIEW

Auto Lead Warmer Firebase Functions provides the AI-powered backend services for the lead nurturing automation system. It offers unified multi-LLM API integration, user management, token tracking, and pixel tracking services for the Google Apps Script frontend.

### 🎯 **CORE SERVICES**
- 🤖 **Multi-LLM API Integration**: Unified access to Perplexity, Gemini, and OpenAI services
- 👥 **User Authentication & Management**: User verification and usage tracking
- 📊 **Token Consumption Analytics**: Cost tracking and usage statistics
- 🔒 **Secure API Key Management**: Environment-based configuration
- 🌏 **Regional Deployment**: Optimized asia-east1 deployment
- 📈 **Pixel Tracking**: Email open detection and analytics

### 🏗️ **SYSTEM ARCHITECTURE**

#### **Service Layer Architecture**
```
┌─────────────────────────────────────────┐
│           Apps Script Client            │
│        (Frontend/Google Sheets)         │
├─────────────────────────────────────────┤
│          Firebase Functions             │
│            (API Gateway)                │
├─────────────────────────────────────────┤
│           LLM Services                  │
│   Perplexity | Gemini | OpenAI         │
├─────────────────────────────────────────┤
│           User Management               │
│         (Google Sheets DB)              │
└─────────────────────────────────────────┘
```

#### **Technology Stack**
- **Runtime**: Node.js 20
- **Framework**: Firebase Functions v2
- **Authentication**: Apps Script JWT + User verification
- **Storage**: Google Sheets (user data), Firestore (pixel tracking)
- **Monitoring**: Firebase Console + Stackdriver
- **Region**: asia-east1 (optimized for Taiwan/Asia)

### **API Architecture Pattern**
```javascript
// Unified API call entry point
exports.callLLMAPI = onCall({
  region: 'asia-east1',
  memory: '256MiB',
  timeoutSeconds: 120
}, async (request) => {
  // User verification → Provider routing → API call → Usage tracking
});
```

---

## 📁 PROJECT STRUCTURE

### 🔧 **Core Configuration Files**
```
firebase/
├── firebase.json             # Firebase project configuration
├── .firebaserc              # Deployment target configuration
├── firestore.rules          # Firestore security rules
└── firestore.indexes.json   # Firestore indexing configuration
```

### 🎯 **Functions Directory**
```
functions/
├── index.js                 # Main entry point and function exports
├── package.json             # Dependency management and scripts
├── build.js                 # Build script
├── .env                     # Environment variable configuration
├── .mocharc.json           # Testing configuration
└── CLAUDE.md               # This development documentation
```

### 🧩 **Core Service Modules**
```
src/
├── llm-service.js           # LLM API unified calling service
├── user-service.js          # User management and authentication
├── token-service.js         # Token calculation and tracking
├── cost-service.js          # Cost analysis and reporting
└── pixel-service.js         # Email pixel tracking service
```

---

## ⚙️ DEVELOPMENT ENVIRONMENT SETUP

### **Environment Prerequisites**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Authenticate with Firebase
firebase login

# Initialize project
firebase init functions

# Switch to functions directory
cd functions
```

### **Local Development Workflow**
```bash
# Install dependencies
npm install

# Run local emulator
npm run serve

# Run tests
npm test

# Generate test coverage
npm run test:coverage
```

### **Environment Variable Configuration**
```bash
# Set API keys using Firebase config
firebase functions:config:set \
  perplexity.api_key="YOUR_KEY" \
  gemini.api_key="YOUR_KEY" \
  openai.api_key="YOUR_KEY"
```

---

## 🔌 API SERVICE DOCUMENTATION

### **1. Unified LLM API Calling**
```javascript
/**
 * Main entry point - Unified LLM API calling
 * @param {Object} request.data
 * @param {string} request.data.prompt - AI prompt
 * @param {string} request.data.provider - Provider (perplexity|gemini|gpt)
 * @param {string} request.data.model - Model name
 * @param {number} request.data.temperature - Creativity level (0-2)
 * @param {number} request.data.maxTokens - Maximum token count
 */
exports.callLLMAPI = onCall({...}, async (request) => {
  // Unified LLM calling logic implementation
});
```

### **2. Provider-Specific Services**

#### **Perplexity API Integration**
```javascript
// Search-enhanced generation, suitable for queries requiring latest information
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  // Uses Sonar Pro model for high-precision inference
  // Supports real-time web search
}
```

#### **Google Gemini API Integration**
```javascript
// Uses official @google/genai SDK
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash') {
  // Thinking mode disabled for faster response
  // Supports multimodal input
}
```

#### **OpenAI API Integration**
```javascript
// Supports GPT-5-mini and GPT-4.1-mini
async function callGPTAPI(prompt, model = 'gpt-5-mini-2025-08-07') {
  // Auto-routes to corresponding API implementation
  // Handles different model parameter limitations
}
```

### **3. User Management Services**
```javascript
/**
 * User authentication and payment status verification
 */
exports.createUser = onCall({...}, async (request) => {
  // Create new user record
});

exports.getUserInfo = onCall({...}, async (request) => {
  // Get user information and usage statistics
});

exports.updateUserUsage = onCall({...}, async (request) => {
  // Update user token usage
});
```

### **4. Pixel Tracking Services**
```javascript
/**
 * Email pixel tracking for open detection
 */
exports.pixelTracker = onRequest({...}, async (req, res) => {
  // Handle pixel tracking requests and return 1x1 transparent GIF
});

exports.getPixelOpens = onCall({...}, async (request) => {
  // Retrieve pixel open records for Apps Script
});
```

---

## 🔄 **DECOUPLING PRINCIPLES**

### **Service Layer Separation**
```javascript
// ✅ CORRECT: Decoupled service design
class LLMService {
  constructor(apiClients, tokenService, userService) {
    this.apiClients = apiClients;
    this.tokenService = tokenService;
    this.userService = userService;
  }

  async callAPI(provider, prompt, options) {
    // Clear interface, testable in isolation
    const client = this.apiClients[provider];
    return await client.call(prompt, options);
  }
}

// ❌ WRONG: Tightly coupled direct access
class LLMService {
  async callAPI(provider, prompt) {
    const apiKey = process.env.PERPLEXITY_API_KEY; // Direct env access
    const response = await fetch('https://api.perplexity.ai/...'); // Direct API call
  }
}
```

### **Provider Abstraction**
```javascript
// ✅ CORRECT: Provider interface abstraction
class ProviderInterface {
  constructor(apiKey, config) {
    this.apiKey = apiKey;
    this.config = config;
  }

  async callAPI(prompt, options) {
    // Abstract interface implementation
  }

  parseResponse(response) {
    // Standardized response parsing
  }
}

class PerplexityProvider extends ProviderInterface {
  async callAPI(prompt, options) {
    // Perplexity-specific implementation
  }
}
```

### **Configuration Management**
```javascript
// ✅ CORRECT: Centralized configuration
class ConfigService {
  static getAPIKey(provider) {
    const config = functions.config();
    return config[provider]?.api_key;
  }

  static getModelConfig(provider, model) {
    return MODEL_CONFIGS[provider][model];
  }
}

// ❌ WRONG: Scattered configuration
const perplexityKey = process.env.PERPLEXITY_API_KEY; // Scattered across files
const geminiKey = functions.config().gemini.api_key;  // Inconsistent access
```

---

## 🧹 **CODE CLEANUP REQUIREMENTS**

### **Post-Deployment Cleanup Checklist**
```javascript
// After making changes, ALWAYS verify:
// 1. Are there unused function exports?
// 2. Can any require() statements be removed?
// 3. Are there obsolete utility functions?
// 4. Can any environment variables be consolidated?

// ✅ CORRECT: Clean up after refactoring
// OLD: Separate functions for each provider
exports.callPerplexityAPI = onCall({...}, async (request) => { /* ... */ });
exports.callGeminiAPI = onCall({...}, async (request) => { /* ... */ });
exports.callOpenAIAPI = onCall({...}, async (request) => { /* ... */ });

// NEW: Unified function
exports.callLLMAPI = onCall({...}, async (request) => { /* ... */ });
// CLEANUP: Remove the three old function exports ← MANDATORY
```

### **Function Export Analysis**
```javascript
// Before removing any exported function, verify:
// 1. Search Apps Script codebase for function calls
// 2. Check if used in APIService.js
// 3. Verify not used in testing code
// 4. Confirm not referenced in documentation

// Use Grep tool to search for function usage:
// Grep(pattern="functionName", path="../apps-script", output_mode="files_with_matches")
```

---

## 🔒 SECURITY & PERMISSIONS MANAGEMENT

### **Environment Variable Security**
```javascript
// ✅ CORRECT: Use Firebase Config for sensitive information
const apiKey = functions.config().perplexity.api_key;
if (!apiKey) {
  throw new Error('API_KEY environment variable not set');
}
```

### **User Authentication Flow**
```javascript
// 1. Verify source (Apps Script)
const { auth } = context;
if (!auth || !auth.uid) {
  throw new HttpsError('unauthenticated', 'User not authenticated');
}

// 2. Check payment status
const userInfo = await getUserPaymentStatus(email);
if (!userInfo.isPaid) {
  throw new HttpsError('permission-denied', 'Paid subscription required');
}
```

### **API Call Rate Limiting**
```javascript
// Rate limiting and usage control
const dailyLimit = 10000; // Tokens per day
if (currentUsage + requestTokens > dailyLimit) {
  throw new HttpsError('resource-exhausted', 'Daily usage limit exceeded');
}
```

---

## 📊 MONITORING & LOGGING

### **Logging Strategy**
```javascript
// Structured logging
console.log('=== LLM API Call Started ===');
console.log('User:', email);
console.log('Provider:', provider);
console.log('Model:', model);
console.log('Prompt length:', prompt.length);

// Performance monitoring
const startTime = Date.now();
const result = await apiCall();
const duration = Date.now() - startTime;
console.log(`API call duration: ${duration}ms`);
```

### **Error Handling**
```javascript
try {
  const result = await callLLMAPI(prompt, provider, model);
  return result;
} catch (error) {
  console.error(`${provider} API call failed:`, error);

  // Categorize error types
  if (error.status === 429) {
    throw new HttpsError('resource-exhausted', 'API call rate limit exceeded');
  } else if (error.status === 401) {
    throw new HttpsError('permission-denied', 'Invalid API key');
  } else {
    throw new HttpsError('internal', 'Service temporarily unavailable');
  }
}
```

### **Usage Statistics**
```javascript
// Token consumption tracking
const tokenUsage = {
  provider: provider,
  model: model,
  promptTokens: result.usage?.prompt_tokens || 0,
  completionTokens: result.usage?.completion_tokens || 0,
  totalTokens: result.usage?.total_tokens || 0,
  timestamp: new Date().toISOString()
};

await updateUserUsage(email, tokenUsage);
```

---

## 🚀 DEPLOYMENT & MAINTENANCE

### **Deployment Process**
```bash
# 1. Build project
npm run build

# 2. Deploy to Firebase
firebase deploy --only functions

# 3. Check deployment status
firebase functions:log

# 4. Monitor performance
firebase console
```

### **Environment Management**
```bash
# Development environment
firebase use development
firebase deploy --only functions

# Production environment
firebase use production
firebase deploy --only functions
```

### **Version Management**
```javascript
// package.json version tracking
{
  "name": "functions",
  "version": "2.0.0",
  "engines": {
    "node": "20"
  }
}
```

---

## 🛠️ DEVELOPMENT BEST PRACTICES

### ✅ **Recommended Practices**

#### **Error Handling**
```javascript
// Complete error handling chain
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error('API call failed:', error);
  return { success: false, error: error.message };
}
```

#### **Asynchronous Operations**
```javascript
// Correct asynchronous handling
const result = await Promise.all([
  callPerplexityAPI(prompt1),
  callGeminiAPI(prompt2),
  callGPTAPI(prompt3)
]);
```

#### **Resource Management**
```javascript
// Appropriate memory and timeout settings
exports.heavyTask = onCall({
  memory: '512MiB',
  timeoutSeconds: 300,
  region: 'asia-east1'
}, async (request) => {
  // Handle large tasks
});
```

### ❌ **Practices to Avoid**

```javascript
// ❌ Hardcoded API keys
const apiKey = "sk-12345...";

// ❌ Ignoring error handling
const result = callAPI(); // May cause Functions to crash

// ❌ Exceeding time limits
// Don't execute tasks longer than 9 minutes in a single Function

// ❌ Ignoring memory limits
// Avoid processing large datasets under 256MB limit
```

### **Performance Optimization**
```javascript
// 1. Utilize caching
const cache = new Map();
if (cache.has(key)) {
  return cache.get(key);
}

// 2. Batch processing
const batch = requests.slice(0, 10); // Limit concurrent requests

// 3. Early return
if (!isValid(input)) {
  return { error: 'Invalid input' };
}
```

---

## 🧪 TESTING STRATEGY

### **Unit Testing**
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### **Integration Testing**
```javascript
// Test LLM API integration
describe('LLM API Integration', () => {
  it('should call Perplexity API successfully', async () => {
    const result = await callPerplexityAPI('test prompt');
    expect(result).to.have.property('content');
  });
});
```

### **Load Testing**
```javascript
// Test API load capacity
const concurrentRequests = 10;
const promises = Array(concurrentRequests).fill(null).map(() =>
  callLLMAPI('test', 'perplexity', 'sonar-pro')
);
const results = await Promise.all(promises);
```

---

## 📈 COST OPTIMIZATION

### **Token Usage Optimization**
```javascript
// 1. Smart prompt truncation
const truncatedPrompt = prompt.length > 4000 ?
  prompt.substring(0, 4000) + '...' : prompt;

// 2. Model selection strategy
const model = complexity > 0.8 ? 'sonar-pro' : 'sonar';

// 3. Cache common results
const cacheKey = `${provider}_${hashPrompt(prompt)}`;
```

### **Provider Cost Analysis**
```javascript
// Cost comparison and routing
const costPerToken = {
  'perplexity-sonar': 0.0001,
  'gemini-2.5-flash': 0.00005,
  'gpt-5-mini': 0.00015
};

// Select most economical provider
const optimal = findOptimalProvider(prompt, requirements);
```

---

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ **WRONG APPROACH (Creates Technical Debt)**
```javascript
// Creating new file without searching first
Write(file_path="new_llm_service.js", content="...")
```

### ✅ **CORRECT APPROACH (Prevents Technical Debt)**
```javascript
// 1. SEARCH FIRST
Grep(pattern="llm.*service", glob="*.js")
// 2. READ EXISTING FILES
Read(file_path="src/llm-service.js")
// 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="src/llm-service.js", old_string="...", new_string="...")
```

### 🧹 **DEBT PREVENTION WORKFLOW**

#### **Before Creating ANY New File:**
1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

#### **After Making ANY Changes:**
1. **🔍 Function Analysis** - Identify potentially unused functions
2. **📋 Usage Search** - Use Grep to find all function references
3. **🧹 Cleanup** - Remove confirmed unused code
4. **✅ Verification** - Ensure no broken dependencies
5. **📈 Consolidation** - Merge similar functionality where possible

---

## 🔧 LLM SERVICE IMPLEMENTATION DETAILS

### **Perplexity API Integration**
```javascript
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  const apiKey = functions.config().perplexity.api_key;

  const requestBody = {
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides accurate information.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: maxTokens,
    return_citations: true,
    search_domain_filter: ["perplexity.ai"],
    return_images: false,
    return_related_questions: false
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  return await response.json();
}
```

### **Gemini API Integration**
```javascript
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash') {
  const { GoogleGenerativeAI } = require('@google/genai');
  const apiKey = functions.config().gemini.api_key;

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model: model,
    systemInstruction: {
      parts: [{
        text: "You are a helpful assistant. Respond in Traditional Chinese unless otherwise specified."
      }]
    }
  });

  const result = await generativeModel.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }]
  });

  return {
    content: result.response.text(),
    usage: {
      prompt_tokens: result.response.usageMetadata?.promptTokenCount || 0,
      completion_tokens: result.response.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: result.response.usageMetadata?.totalTokenCount || 0
    }
  };
}
```

### **OpenAI GPT API Integration**
```javascript
async function callGPTAPI(prompt, model = 'gpt-5-mini-2025-08-07', temperature, maxTokens) {
  const apiKey = functions.config().openai.api_key;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Always respond in Traditional Chinese unless specifically asked otherwise.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  // GPT-5-mini special handling
  if (model === 'gpt-5-mini-2025-08-07') {
    // GPT-5-mini doesn't support temperature and top_p parameters
    if (maxTokens) {
      requestBody.max_completion_tokens = maxTokens;
    }
  } else {
    // Other GPT models support full parameters
    if (temperature !== undefined) {
      requestBody.temperature = temperature;
    }
    if (maxTokens) {
      requestBody.max_completion_tokens = maxTokens;
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  return await response.json();
}
```

---

## 🔍 TROUBLESHOOTING

### **Common Issues**

#### **Deployment Failures**
```bash
# Check Node.js version
node --version  # Should be v20.x

# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **API Call Timeouts**
```javascript
// Increase timeout
exports.longRunningTask = onCall({
  timeoutSeconds: 300  // 5 minutes
}, async (request) => {
  // Long-running task
});
```

#### **Memory Issues**
```javascript
// Increase memory configuration
exports.memoryIntensiveTask = onCall({
  memory: '1GiB'  // Maximum 8GiB
}, async (request) => {
  // Memory-intensive task
});
```

#### **API Key Issues**
```bash
# Check environment variables
firebase functions:config:get

# Reset API key
firebase functions:config:set openai.api_key="new_key"
```

---

**⚠️ Prevention is better than consolidation - build clean from the start.**
**🎯 Focus on single source of truth and extending existing functionality.**
**🔄 Always design for decoupling and maintainability.**
**🧹 Clean up code after every change - remove what's no longer needed.**
**🔒 Secure all API keys and sensitive information through environment variables.**

---

*Last Updated: 2025-09-22*
*Version: v2.0*