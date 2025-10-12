# CLAUDE.md - Auto Lead Warmer Apps Script

> **Documentation Version**: 2.0
> **Last Updated**: 2025-09-22
> **Project**: Auto Lead Warmer - Google Apps Script Frontend
> **Description**: AI-driven lead nurturing automation system with Google Sheets integration
> **Features**: GitHub auto-backup, Task agents, technical debt prevention, decoupling architecture

This file provides essential guidance to Claude Code (claude.ai/code) when working with the Apps Script frontend of the Auto Lead Warmer system.

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

Auto Lead Warmer is an AI-powered Google Apps Script add-on that automates lead nurturing for seminar and event organizers. The system generates personalized follow-up emails using AI analysis and manages the entire outreach workflow through Google Sheets.

### 🎯 **CORE FEATURES**
- 🤖 **AI-Driven Lead Profiling**: Generate detailed customer profiles using Perplexity, Gemini, and OpenAI
- 📧 **Personalized Email Generation**: Create targeted follow-up emails based on lead analysis
- ⏰ **Intelligent Scheduling**: Automated email sending with optimal timing
- 📊 **Reply Detection**: Monitor and track email responses automatically
- 🔄 **Workflow Management**: Complete lead lifecycle management through Google Sheets UI
- 📈 **Pixel Tracking**: Email open detection for engagement analytics

### 🏗️ **SYSTEM ARCHITECTURE**

#### **Layered Architecture**
```
┌─────────────────────────────────────────┐
│              User Interface             │
│           (Google Sheets UI)            │
├─────────────────────────────────────────┤
│            Business Logic               │
│        (Processing Services)            │
├─────────────────────────────────────────┤
│             Data Layer                  │
│    (SheetService + Config Management)   │
├─────────────────────────────────────────┤
│           External Services             │
│      (Firebase Functions + Gmail)       │
└─────────────────────────────────────────┘
```

#### **Technology Stack**
- **Platform**: Google Apps Script (V8 Runtime)
- **API Integration**: Gmail API, Google Sheets API v4
- **AI Services**: Firebase Functions (Perplexity, Gemini, OpenAI)
- **Data Storage**: Google Sheets as database
- **Authentication**: OAuth scopes for spreadsheets + gmail.send/readonly

---

## 📁 FILE STRUCTURE & ARCHITECTURE

### 🔧 **Core System Files**
```
apps-script/
├── Code.js                    # Main entry point and menu setup
├── Config.js                  # Configuration constants and column definitions
├── appsscript.json           # OAuth permissions and service configuration
└── CLAUDE.md                 # This development documentation
```

### 🎯 **Business Logic Layer**
```
├── ProcessingService.js      # Main business workflow controller
├── RowProcessor.js          # Individual row data processing logic
├── ContentGenerator.js      # AI content generation service
└── UserInfoService.js       # User information management
```

### 🔗 **API Service Layer**
```
├── APIService.js            # External API call wrapper
├── SheetService.js          # Google Sheets operations
├── EmailService.js          # Email sending and scheduling
├── ReplyDetectionService.js # Email reply monitoring
└── PixelTrackingService.js  # Email open tracking
```

### 🎛️ **Feature Modules**
```
├── EditHandler.js           # Spreadsheet edit event handling
├── SendNowHandler.js        # Immediate email sending functionality
├── TriggerManager.js        # Time-based trigger management
├── MenuService.js           # Menu functionality service
├── StatisticsService.js     # Analytics and reporting
└── Utils.js                 # Common utility functions
```

---

## 🔄 CORE WORKFLOWS

### **1. Initial Setup Workflow**
```javascript
setupHeadersAndFormat()
  ↓
SheetService.setupHeaders() // Configure spreadsheet headers
  ↓
SheetService.formatAllLeadRows() // Apply formatting
  ↓
UserInfoService.createUserInfoSheet() // Create user config sheet
```

### **2. Lead Processing Workflow**
```javascript
runAutoLeadWarmer()
  ↓
ProcessingService.processNewLeads()
  ↓
RowProcessor.processRow() // Process each lead individually
  ↓
generateLeadsProfile() → generateMailAngles() → generateEmails()
  ↓
EmailService.scheduleEmails() // Set up email scheduling
```

### **3. Email Sending Workflow**
```javascript
[Timer Trigger] sendScheduledEmails()
  ↓
EmailService.checkAndSendEmails()
  ↓
Gmail API sending + status updates
  ↓
ReplyDetectionService.checkReplies() // Monitor for responses
```

---

## ⚙️ DEVELOPMENT SETUP

### **Environment Prerequisites**
```bash
# Install clasp CLI for Apps Script development
npm install -g @google/clasp

# Authenticate with Google account
clasp login

# Clone project to local development
clasp clone [SCRIPT_ID]
```

### **Local Development Workflow**
```bash
# Push code changes to Apps Script
clasp push

# Force push including new files
clasp push --force

# Open online Apps Script editor
clasp open
```

### **OAuth Permission Configuration**
> **Important**: Permission changes require re-authorization

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

---

## 🛠️ DEVELOPMENT BEST PRACTICES

### 🔄 **DECOUPLING PRINCIPLES**

#### **Service Layer Separation**
```javascript
// ✅ CORRECT: Decoupled service design
class EmailService {
  constructor(apiService, sheetService) {
    this.apiService = apiService;
    this.sheetService = sheetService;
  }

  async sendEmail(emailData) {
    // Clear interface, testable in isolation
  }
}

// ❌ WRONG: Tightly coupled direct access
class EmailService {
  async sendEmail(emailData) {
    const result = APIService.callLLMAPI(); // Direct dependency
    SpreadsheetApp.getActiveSheet(); // Hard-coded access
  }
}
```

#### **Interface Design**
```javascript
// ✅ CORRECT: Clear interface contracts
const IContentGenerator = {
  generateLeadsProfile: (url, position) => Promise,
  generateMailAngles: (profile) => Promise,
  generateEmail: (profile, angle) => Promise
};

// ❌ WRONG: Unclear responsibilities
function doEverything(data) {
  // Multiple responsibilities in one function
}
```

#### **Dependency Injection**
```javascript
// ✅ CORRECT: Injectable dependencies
class ProcessingService {
  constructor(contentGenerator, emailService, sheetService) {
    this.contentGenerator = contentGenerator;
    this.emailService = emailService;
    this.sheetService = sheetService;
  }
}

// ❌ WRONG: Hard-coded dependencies
class ProcessingService {
  process() {
    ContentGenerator.generate(); // Hard dependency
  }
}
```

### 🧹 **CODE CLEANUP REQUIREMENTS**

#### **Post-Change Cleanup Checklist**
```javascript
// After making changes, ALWAYS verify:
// 1. Are there unused functions?
// 2. Can any imports be removed?
// 3. Are there obsolete utility functions?
// 4. Can any constants be consolidated?

// ✅ CORRECT: Clean up after refactoring
// OLD: Separate functions for each email type
function generateFirstEmail() { /* ... */ }
function generateSecondEmail() { /* ... */ }
function generateThirdEmail() { /* ... */ }

// NEW: Unified function
function generateEmail(emailNumber) { /* ... */ }
// CLEANUP: Remove the three old functions ← MANDATORY
```

#### **Function Usage Analysis**
```javascript
// Before removing any function, verify:
// 1. Search codebase for all references
// 2. Check if used in menu callbacks
// 3. Verify not used in trigger functions
// 4. Confirm not used in global scope

// Use Grep tool to search for function usage:
// Grep(pattern="functionName", output_mode="files_with_matches")
```

### ✅ **Recommended Practices**

#### **Service Modularization**
```javascript
// 1. Use service-based design patterns
const result = ContentGenerator.generateLeadsProfile(url, position);

// 2. Implement comprehensive error handling
try {
  // Business logic
} catch (error) {
  console.error('Operation failed:', error);
  SpreadsheetApp.getUi().alert('Error', error.message);
}

// 3. Use configuration constants
const statusCell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);

// 4. Implement proper state management
SheetService.updateStatus(rowIndex, 'Processing');
```

#### **Performance Optimization**
```javascript
// 1. Batch operations for efficiency
const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

// 2. Control API call frequency
SpreadsheetApp.flush(); // Control refresh timing

// 3. Cache frequently accessed data
const userInfo = UserInfoService.getUserInfo(); // Single retrieval
```

### ❌ **Practices to Avoid**

```javascript
// ❌ Direct SpreadsheetApp access without service layer
SpreadsheetApp.getActiveSheet().getRange(1,1).setValue();

// ❌ Hard-coded configuration values
const column = 5; // Should use COLUMNS.LEADS_PROFILE

// ❌ Ignoring permission requirements
Sheets.Spreadsheets.batchUpdate(); // Requires spreadsheets permission

// ❌ Not handling asynchronous operations properly
APIService.callLLMAPI(); // Should await the result

// ❌ Creating tight coupling between modules
class ServiceA {
  method() {
    ServiceB.directCall(); // Should use interface
  }
}
```

---

## 🔍 TESTING & DEBUGGING

### **Manual Testing Procedures**
1. **Initial Setup Testing**: Verify header setup and formatting
2. **API Integration Testing**: Validate Firebase Functions connectivity
3. **Email Functionality Testing**: Use test email addresses for verification
4. **Trigger Testing**: Confirm scheduled task execution

### **Common Issue Resolution**

#### **Permission Issues**
```
Error: Insufficient permissions
Solution: Check appsscript.json permission configuration, re-authorize
```

#### **API Call Failures**
```
Error: Firebase Functions call timeout
Solution: Verify network connectivity and API key configuration
```

#### **Trigger Problems**
```
Error: Emails not sending on schedule
Solution: Check trigger setup and GMT timezone configuration
```

---

## 📊 MONITORING & MAINTENANCE

### **Logging Strategy**
```javascript
// Apps Script execution logging
console.log() output → Stackdriver Logging

// Error tracking implementation
catch (error) {
  console.error('Detailed error information:', error);
}
```

### **Performance Monitoring**
- Monitor API call frequency and response times
- Track trigger execution patterns
- Analyze user operation statistics

### **Regular Maintenance Tasks**
- Clean up expired triggers
- Update API keys and permissions
- Verify third-party service status

---

## 🚀 DEPLOYMENT GUIDELINES

### **Release Process**
1. **Code Review**: Ensure all functionality works correctly
2. **Permission Verification**: Validate appsscript.json configuration
3. **Code Push**: `clasp push --force`
4. **User Testing**: Test in actual environment

### **Version Management**
```bash
# Create version
clasp version "v2.0.0 - Enhanced AI integration with decoupling"

# Deploy specific version
clasp deploy --versionNumber 15
```

---

## 🔧 SERVICE LAYER DETAILED DOCUMENTATION

### **SheetService.js - Spreadsheet Operations Core**
```javascript
// Primary functions
- getMainSheet(): Retrieve main worksheet
- setupHeaders(): Configure headers and formatting
- updateStatus(): Update row status
- formatAllLeadRows(): Format all data rows
- setupColumnWidths(): Configure column widths
```

### **ContentGenerator.js - AI Content Generation**
```javascript
// Core functionality
- generateLeadsProfile(): Generate customer profile
- generateMailAngles(): Generate email angles
- parseMailAngles(): Parse AI responses
- generateSingleFollowUpMail(): Generate follow-up emails
```

### **ProcessingService.js - Business Workflow Control**
```javascript
// Primary responsibilities
- processNewLeads(): Process new potential customers
- checkStopSignal(): Monitor stop conditions
- Error handling and state management
```

### **EmailService.js - Email Management**
```javascript
// Core functionality
- scheduleEmails(): Set up email scheduling
- checkAndSendEmails(): Check and send scheduled emails
- sendSingleEmail(): Send individual emails
- generateNextMailContent(): Generate subsequent email content
```

---

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ **WRONG APPROACH (Creates Technical Debt)**
```javascript
// Creating new file without searching first
Write(file_path="new_feature.js", content="...")
```

### ✅ **CORRECT APPROACH (Prevents Technical Debt)**
```javascript
// 1. SEARCH FIRST
Grep(pattern="feature.*implementation", glob="*.js")
// 2. READ EXISTING FILES
Read(file_path="existing_feature.js")
// 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="existing_feature.js", old_string="...", new_string="...")
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

## 🎯 **AUTO LEAD WARMER SPECIFIC CONFIGURATIONS**

### **Column Configuration (Config.js)**
```javascript
const COLUMNS = {
  EMAIL: 0,         // A: Email Address*
  FIRST_NAME: 1,    // B: First Name*
  COMPANY_URL: 2,   // C: Company url*
  POSITION: 3,      // D: Position*
  LEADS_PROFILE: 4, // E: Leads Profile
  MAIL_ANGLE_1: 5,  // F: 1st mail angle
  FOLLOW_UP_1: 6,   // G: 1st follow up mail
  SCHEDULE_1: 7,    // H: 1st mail schedule
  // ... additional columns
};
```

### **User Information Fields**
```javascript
const USER_INFO_FIELDS = {
  GREETING: { row: 2, col: 2, label: 'Email Greeting' },
  NAME: { row: 3, col: 2, label: 'Name' },
  COMPANY: { row: 4, col: 2, label: 'Company' },
  TITLE: { row: 5, col: 2, label: 'Title' },
  CONTACT: { row: 6, col: 2, label: 'Contact' },
  SEMINAR_INFO: { row: 7, col: 2, label: 'Seminar Info' },
  SEMINAR_BRIEF: { row: 8, col: 2, label: 'Seminar Brief' }
};
```

---

**⚠️ Prevention is better than consolidation - build clean from the start.**
**🎯 Focus on single source of truth and extending existing functionality.**
**🔄 Always design for decoupling and maintainability.**
**🧹 Clean up code after every change - remove what's no longer needed.**

---

*Last Updated: 2025-09-22*
*Version: v2.0*