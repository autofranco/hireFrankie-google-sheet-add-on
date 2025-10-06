# Auto Lead Warmer - Apps Script

AI-powered lead nurturing automation system for Google Sheets.

## 📁 Folder Structure

```
apps-script/
├── core/                          # Entry points & configuration
│   ├── Code.js                    # Main entry point, menu setup
│   ├── Config.js                  # Constants & column definitions
│   └── appsscript.json           # Apps Script manifest & permissions
│
├── services/                      # Main business services
│   ├── APIService.js             # External API integration (Firebase)
│   ├── ContentGenerator.js       # AI content generation (Perplexity, GPT)
│   ├── EmailService.js           # Email sending & scheduling
│   ├── ProcessingService.js      # Workflow orchestration
│   ├── SheetService.js           # Google Sheets operations
│   └── UserInfoService.js        # User data management
│
├── features/                      # Feature modules (grouped by domain)
│   ├── analytics/
│   │   ├── AnalyticsService.js   # Engagement metrics
│   │   └── StatisticsService.js  # API usage tracking
│   │
│   ├── detection/
│   │   ├── BounceDetectionService.js  # Email bounce detection
│   │   ├── PixelTrackingService.js    # Open tracking
│   │   └── ReplyDetectionService.js   # Reply monitoring
│   │
│   └── triggers/
│       └── TriggerManager.js     # Scheduled task management
│
├── handlers/                      # Event & UI handlers
│   ├── EditHandler.js            # Sheet edit events
│   ├── MenuService.js            # Menu functionality
│   └── SendNowHandler.js         # Immediate send feature
│
├── logic/                         # Pure business logic (100% testable)
│   ├── BatchProcessor.js         # Batch processing utilities
│   ├── EmailParser.js            # Email parsing logic
│   ├── LeadValidation.js         # Lead validation logic
│   ├── ScheduleCalculator.js     # Schedule calculations
│   ├── SetupHelpers.js           # Setup configuration
│   ├── RunAllTests.js            # Test runner
│   └── README.md                 # Logic module documentation
│
├── utils/                         # Shared utilities
│   ├── ToastService.js           # User notifications
│   └── Utils.js                  # Common helper functions
│
└── docs/                          # Documentation
    ├── ARCHITECTURE.md            # System architecture
    ├── AppsScriptFunctionBrief.md # Function documentation
    └── CLAUDE.md                  # Development guidelines

```

## 🚀 Quick Start

### Prerequisites
```bash
npm install -g @google/clasp
clasp login
```

### Development Workflow
```bash
# Push code to Apps Script
clasp push

# Open Apps Script editor
clasp open

# Pull latest from Apps Script
clasp pull
```

## 🏗️ Architecture Layers

### Layer 1: Entry & Configuration (core/)
- **Code.js** - Application entry point, menu setup
- **Config.js** - Centralized configuration
- **appsscript.json** - OAuth scopes & runtime settings

### Layer 2: Business Services (services/)
High-level orchestration and business logic:
- API integration
- Content generation
- Email lifecycle management
- Sheet operations
- Workflow control

### Layer 3: Features (features/)
Self-contained feature modules:
- **Analytics** - Metrics and usage tracking
- **Detection** - Email monitoring (bounces, opens, replies)
- **Triggers** - Automated scheduling

### Layer 4: Handlers (handlers/)
User interaction and event handling:
- Sheet edit events
- Menu actions
- UI coordination

### Layer 5: Logic (logic/)
**Pure business logic** - 100% testable without Google APIs:
- No side effects
- Deterministic outputs
- Framework independent

### Layer 6: Utilities (utils/)
Shared helper functions and services

## 🧪 Testing

Run tests from Apps Script editor or add to your spreadsheet menu:

```javascript
// Quick smoke test
runSmokeTests();

// Comprehensive tests
runAllLogicTests();

// Individual module tests
runAllLeadValidationTests();
runAllScheduleCalculatorTests();
runAllEmailParserTests();
runAllBatchProcessorTests();
runAllSetupHelpersTests();
```

See [logic/README.md](logic/README.md) for detailed testing documentation.

## 📝 Development Guidelines

- **ALWAYS** read [docs/CLAUDE.md](docs/CLAUDE.md) before making changes
- Follow "Functional Core, Imperative Shell" pattern
- Keep logic/ modules pure (no Google API dependencies)
- Use services/ for orchestration and I/O
- Group related features in features/ subfolders

## 🔧 Key Concepts

### Separation of Concerns
- **Logic** = Pure functions (testable)
- **Services** = Orchestration + Google APIs
- **Features** = Domain-specific modules
- **Handlers** = User interactions

### Dependency Flow
```
core/Code.js
    ↓
handlers/ → services/ → logic/
    ↓           ↓          ↓
features/   utils/    (pure)
```

## 📚 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture & workflows
- **[AppsScriptFunctionBrief.md](docs/AppsScriptFunctionBrief.md)** - Function documentation
- **[CLAUDE.md](docs/CLAUDE.md)** - Development guidelines for AI assistants
- **[logic/README.md](logic/README.md)** - Pure business logic documentation

## 🎯 Design Principles

1. **Single Responsibility** - Each file has one clear purpose
2. **Separation of Concerns** - Business logic separated from I/O
3. **Testability** - Pure functions in logic/ folder
4. **Maintainability** - Clear folder structure
5. **Scalability** - Easy to add new features

## 📦 File Organization Rules

| Folder | Purpose | Dependencies |
|--------|---------|--------------|
| `core/` | Entry points | Can call anything |
| `services/` | Business services | Can use logic/, utils/, features/ |
| `features/` | Feature modules | Can use logic/, utils/, services/ |
| `handlers/` | Event handlers | Can use services/, features/ |
| `logic/` | Pure functions | **No external dependencies** |
| `utils/` | Utilities | Can use logic/ |
| `docs/` | Documentation | N/A |

## 🔐 Permissions (appsscript.json)

Required OAuth scopes:
- `spreadsheets` - Google Sheets access
- `gmail.send` - Send emails
- `gmail.readonly` - Read emails for reply detection
- `script.external_request` - Call Firebase Functions

---

**Version:** v3-standalone
**Pattern:** Service-Oriented Architecture + Functional Core
**Testing:** Pure business logic in logic/ folder (100% testable)
