// config/site.ts
// Centralized configuration for easy customization

export const siteConfig = {
  // ========================================
  // COMPANY INFORMATION
  // ========================================
  company: {
    name: "ImplAI",
    supportEmail: "support@example.com",
  },

  // ========================================
  // LOGIN PAGE (app/page.tsx)
  // ========================================
  login: {
    title: "Welcome to implAI",
    subtitle: "Easily create agents",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    loginButton: "Sign In",
    contactButton: "Contact us to create an account",
    // Feature badges below login
    features: {
      feature1: "Secure",
      feature2: "Real-time",
      feature3: "Enterprise",
    },
  },

  // ========================================
  // CONTACT FORM
  // ========================================
  contact: {
    title: "Request Access",
    subtitle: "Fill out the form below and we'll get back to you soon",
    namePlaceholder: "Your Name",
    emailPlaceholder: "your@email.com",
    messagePlaceholder: "Tell us about your needs...",
    submitButton: "Send Request",
    cancelButton: "Cancel",
  },

  // ========================================
  // FOOTER
  // ========================================
  footer: {
    // Uses company.name automatically for copyright
    privacyLabel: "Privacy Policy",
    termsLabel: "Terms of Service",
  },

  // ========================================
  // LEGAL INFORMATION
  // ========================================
  legal: {
    jurisdiction: "United States",
    lastUpdated: "2024-01-01",
  },

  // ========================================
  // URLS
  // ========================================
  urls: {
    website: "https://example.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },

  // ========================================
  // DASHBOARD - OVERVIEW PAGE
  // ========================================
  dashboardOverview: {
    title: "Overview",
    subtitle: "Your AI agents at a glance",
    subtitleWithData: "Real-time performance metrics",
    // Empty state
    emptyStateTitle: "No calls yet",
    emptyStateDescription: "Your agents haven't made any calls. Once they do, you'll see insights here.",
    // Stats cards
    stats: {
      totalCalls: {
        label: "Total Calls",
        description: "All time calls",
      },
      activeAgents: {
        label: "Active Agents",
        description: "Configured agents",
      },
      avgDuration: {
        label: "Avg Duration",
        description: "Last 30 days",
      },
      completed: {
        label: "Completed",
        description: "Success rate",
      },
    },
    // Welcome card
    welcomeTitle: "Welcome to ImplAI",
    welcomeDescription: "This dashboard tracks your AI agents' performance in real-time. Monitor call volume, success rates, and usage from a single view.",
  },

  // ========================================
  // DASHBOARD - AGENTS PAGE
  // ========================================
  dashboardAgents: {
    title: "My Agents",
    subtitle: "Manage your AI agent configurations",
    // Empty state
    emptyStateTitle: "No agents yet",
    emptyStateDescription: "Contact support to create your first AI agent and start making calls.",
    // Agent card
    editPromptButton: "Edit Prompt",
    statusActive: "Active",
    statusPaused: "Paused",
    // Edit modal
    modalTitle: "Edit Prompt",
    modalPlaceholder: "Enter your agent's prompt...",
    modalCancel: "Cancel",
    modalSave: "Save Prompt",
    modalSaving: "Saving...",
    // Toast messages
    nameUpdated: "Agent name updated",
    nameUpdateFailed: "Failed to update name",
    promptUpdated: "Prompt updated successfully",
    promptUpdateFailed: "Error saving prompt",
    // Errors
    errorNotAuthenticated: "Not authenticated. Please login again.",
    errorSaveFailed: "Failed to save prompt. Please try again.",
  },

  // ========================================
  // DASHBOARD - CALL HISTORY PAGE
  // ========================================
  dashboardCallHistory: {
    title: "Call History",
    subtitle: "Monitor your AI agents' calls in real-time",
    // Search
    searchPlaceholder: "Search phone number...",
    searchButton: "Search",
    searchTooLong: "Search too long (max {max} characters)",
    searchMaxReached: "Max {max} characters",
    // Empty state
    emptyStateTitle: "No calls recorded",
    emptyStateDescription: "Calls will appear here automatically",
    // Table headers
    tableHeaders: {
      dateTime: "Date/Time",
      number: "Number",
      status: "Status",
      duration: "Duration",
      actions: "Actions",
    },
    // Actions
    viewTranscript: "View transcript",
    // Status badges
    statusLabels: {
      completed: "Completed",
      failed: "Failed",
      no_answer: "No Answer",
      in_progress: "In Progress",
      unknown: "Unknown",
    },
    // Pagination
    pageLabel: "Page {current} of {total}",
    previousButton: "Previous",
    nextButton: "Next",
    // Modal
    modalTitle: "Call Details",
    modalTranscriptTitle: "Transcript",
    modalNoTranscript: "No transcript available for this call.",
    modalDuration: "Duration: {duration}",
    modalClose: "Close",
    // Toast messages
    newCall: "New call: {phone}",
    // Errors
    errorNotAuthenticated: "Error: Client not authenticated",
  },

  // ========================================
  // STRIPE BANNER
  // ========================================
  stripeBanner: {
    message: "Get minutes to receive more calls",
    buttonText: "Buy Minutes",
    toastRedirecting: "Redirecting to secure payment...",
    toastNotConfigured: "Payment link not configured. Please contact support.",
  },
} as const;

export type SiteConfig = typeof siteConfig;
