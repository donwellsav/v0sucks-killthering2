# Kill The Ring — Freemium Implementation Guide with LemonSqueezy

## Complete Step-by-Step Guide to Monetizing with License Keys

This document provides a detailed, implementation-ready guide for adding a freemium licensing system to Kill The Ring using LemonSqueezy as the payment and license key provider. Every step includes exact code, file paths, and configuration details specific to this codebase.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [LemonSqueezy Account & Product Setup](#2-lemonsqueezy-account--product-setup)
3. [Define Free vs Pro Feature Matrix](#3-define-free-vs-pro-feature-matrix)
4. [Create the License Types & Constants](#4-create-the-license-types--constants)
5. [Build the `useLicense` Hook](#5-build-the-uselicense-hook)
6. [Add the License Activation UI](#6-add-the-license-activation-ui)
7. [Integrate LemonSqueezy Checkout Overlay](#7-integrate-lemonsqueezy-checkout-overlay)
8. [Implement Feature Gating in Components](#8-implement-feature-gating-in-components)
9. [Add Pro Badge & Status Indicators](#9-add-pro-badge--status-indicators)
10. [Handle Session Time Limits (Free Tier)](#10-handle-session-time-limits-free-tier)
11. [Add Webhook Handler for Server-Side Validation (Optional)](#11-add-webhook-handler-for-server-side-validation-optional)
12. [Testing the Full Flow](#12-testing-the-full-flow)
13. [Launch Checklist](#13-launch-checklist)
14. [Appendix: LemonSqueezy API Reference](#appendix-lemonsqueezy-api-reference)

---

## 1. Architecture Overview

### Current Architecture (No Backend)

```
Browser → Mic → Web Audio API → DSP Worker → React State → Canvas
                                                    ↓
                                              localStorage
```

### New Architecture (With Licensing)

```
Browser → Mic → Web Audio API → DSP Worker → React State → Canvas
                                                    ↓
                                              localStorage
                                                    ↓
                                         License State (useLicense hook)
                                                    ↓
                                    ┌───────────────┴──────────────┐
                                    │                              │
                              Feature Gates                  LemonSqueezy API
                           (client-side checks)          (validate/activate keys)
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment processor | LemonSqueezy | Handles tax, payments, license keys — no backend needed |
| License validation | Client-side with API fallback | Works offline after initial activation |
| Feature gating | React hook (`useLicense`) | Consistent with existing hook-based architecture |
| State persistence | localStorage | Matches existing pattern (settings, layout, history) |
| Checkout flow | LemonSqueezy overlay | No redirect, stays in the app |
| Session limits | Client-side timer | Simple enforcement for free tier |

### Data Flow for License Activation

```
1. User clicks "Upgrade to Pro" → LemonSqueezy checkout overlay opens
2. User completes purchase → LemonSqueezy generates license key
3. User receives key via email → enters key in app
   OR
   Checkout callback auto-fills key → app activates immediately
4. App calls LemonSqueezy Validate API → confirms key is valid
5. App stores license data in localStorage → unlocks Pro features
6. Periodic re-validation (every 7 days) ensures key hasn't been revoked
```

---

## 2. LemonSqueezy Account & Product Setup

### Step 2.1: Create a LemonSqueezy Account

1. Go to [https://lemonsqueezy.com](https://lemonsqueezy.com)
2. Sign up for a free seller account
3. Complete your store setup:
   - **Store name:** "Don Wells AV" or "Kill The Ring"
   - **Store URL:** Will be something like `donwellsav.lemonsqueezy.com`
   - **Currency:** USD (recommended for global audience)
4. Complete tax setup (LemonSqueezy handles sales tax/VAT as Merchant of Record)

### Step 2.2: Create the Pro License Product

1. Go to **Store → Products → New Product**
2. Configure as follows:

| Field | Value |
|-------|-------|
| **Name** | Kill The Ring Pro |
| **Description** | Unlock all 8 operation modes, PEQ recommendations, room acoustics, feedback history, and unlimited session length. |
| **Pricing** | See options below |
| **Product type** | Software License |
| **Tax category** | Software / SaaS |

### Step 2.3: Configure Pricing Variants

Create **two variants** under the same product:

**Variant A — Monthly Subscription:**
| Field | Value |
|-------|-------|
| Name | Pro Monthly |
| Price | $6.00/month |
| Billing period | Monthly |
| Free trial | 7 days (optional) |

**Variant B — Annual Subscription (Recommended):**
| Field | Value |
|-------|-------|
| Name | Pro Annual |
| Price | $49.00/year |
| Billing period | Yearly |
| Free trial | 14 days (optional) |

**Alternative: One-Time Purchase Variant:**
| Field | Value |
|-------|-------|
| Name | Pro Lifetime |
| Price | $79.00 one-time |
| Billing period | None (one-time) |

### Step 2.4: Configure License Key Settings

Under **Product → License Keys**:

| Setting | Value | Why |
|---------|-------|-----|
| **Enable license keys** | Yes | Generates keys on purchase |
| **Activation limit** | 3 | Allow 3 devices (laptop, tablet, phone) |
| **Key prefix** | `KTR-` | Easy to identify |
| **Key length** | 16 characters | Standard length |
| **Expiration** | Match subscription period | Auto-expires when sub lapses |

### Step 2.5: Get Your API Key and Store/Product IDs

1. Go to **Settings → API Keys → Create API Key**
2. Copy and save:
   - **API Key:** `your_api_key_here` (used only server-side or for validation)
   - **Store ID:** Found in URL when viewing store (e.g., `12345`)
   - **Product ID:** Found in product URL (e.g., `67890`)
   - **Variant IDs:** Found in variant settings
   - **Checkout URL:** Found under product → Share → Checkout Link

### Step 2.6: Set Up Checkout Overlay

1. Go to **Product → Share**
2. Copy the **Checkout URL** for each variant:
   ```
   https://donwellsav.lemonsqueezy.com/buy/abc123-monthly
   https://donwellsav.lemonsqueezy.com/buy/def456-annual
   ```
3. These URLs will be used with the LemonSqueezy JavaScript overlay

---

## 3. Define Free vs Pro Feature Matrix

### Feature Gate Mapping

Create a clear mapping of which features are free and which require Pro:

| Feature | Free | Pro | Gate Type |
|---------|------|-----|-----------|
| RTA Spectrum view | Yes | Yes | — |
| GEQ Bar view | Yes | Yes | — |
| Basic GEQ recommendations | Yes | Yes | — |
| Input gain control | Yes | Yes | — |
| **Operation modes** | Speech + Live Music only | All 8 modes | `mode_lock` |
| **PEQ recommendations** | Hidden | Full (type, Q, gain) | `feature_lock` |
| **Room acoustics calculator** | Hidden | Full (Schroeder, RT60, modes) | `feature_lock` |
| **Feedback history panel** | Hidden | Full with export | `feature_lock` |
| **EQ Notepad** | Hidden | Full | `feature_lock` |
| **Algorithm scoring display** | Hidden | Full | `feature_lock` |
| **Advanced settings tabs** | Detection only | All 5 tabs | `tab_lock` |
| **CSV/JSON export** | Disabled | Enabled | `feature_lock` |
| **Session length** | 15 minutes | Unlimited | `time_lock` |
| **Custom room presets** | Disabled | Enabled | `feature_lock` |
| **FFT size options** | 8192 only | 4096/8192/16384 | `option_lock` |

### Gate Type Definitions

- **`mode_lock`**: Locks specific operation modes behind Pro
- **`feature_lock`**: Hides entire UI sections/components
- **`tab_lock`**: Disables specific tabs in settings
- **`option_lock`**: Restricts dropdown/select options
- **`time_lock`**: Enforces session duration limit

---

## 4. Create the License Types & Constants

### Step 4.1: Add License Types

**File to create:** `types/license.ts`

```typescript
// types/license.ts

export type LicenseTier = 'free' | 'pro'

export type LicenseStatus =
  | 'inactive'      // No license key entered
  | 'validating'    // Checking with LemonSqueezy API
  | 'active'        // Valid and active
  | 'expired'       // Subscription lapsed
  | 'disabled'      // Manually disabled by seller
  | 'error'         // Validation failed (network, etc.)

export interface LicenseData {
  tier: LicenseTier
  status: LicenseStatus
  licenseKey: string | null
  instanceId: string | null         // LemonSqueezy instance ID for this device
  customerEmail: string | null
  customerName: string | null
  variantName: string | null        // "Pro Monthly", "Pro Annual", "Pro Lifetime"
  activatedAt: string | null        // ISO timestamp
  expiresAt: string | null          // ISO timestamp (null for lifetime)
  lastValidatedAt: string | null    // ISO timestamp of last API check
}

export interface LicenseValidationResponse {
  valid: boolean
  error?: string
  license_key: {
    id: number
    status: string
    key: string
    activation_limit: number
    activation_usage: number
    created_at: string
    expires_at: string | null
    test_mode: boolean
  }
  instance?: {
    id: string
    name: string
    created_at: string
  }
  meta: {
    store_id: number
    order_id: number
    order_item_id: number
    product_id: number
    product_name: string
    variant_id: number
    variant_name: string
    customer_id: number
    customer_name: string
    customer_email: string
  }
}

export interface ProFeatureGates {
  allModes: boolean           // Access to all 8 operation modes
  peqRecommendations: boolean // PEQ filter recommendations
  roomAcoustics: boolean      // Room acoustics calculator
  feedbackHistory: boolean    // Feedback history panel
  eqNotepad: boolean          // EQ Notepad
  algorithmScoring: boolean   // Algorithm status bar
  advancedSettings: boolean   // All 5 settings tabs
  dataExport: boolean         // CSV/JSON export
  unlimitedSession: boolean   // No time limit
  customRoomPresets: boolean  // Save custom room presets
  allFftSizes: boolean        // All FFT size options
}
```

### Step 4.2: Add License Constants

**File to create:** `lib/license/constants.ts`

```typescript
// lib/license/constants.ts

import type { LicenseData, ProFeatureGates } from '@/types/license'

// ── LemonSqueezy Configuration ──────────────────────────────────────────
// Replace these with your actual LemonSqueezy values after setup

export const LEMONSQUEEZY_CONFIG = {
  /** LemonSqueezy API endpoint for license validation */
  API_BASE: 'https://api.lemonsqueezy.com/v1/licenses',

  /** Your store ID (found in LemonSqueezy dashboard URL) */
  STORE_ID: 0, // TODO: Replace with actual store ID

  /** Your product ID */
  PRODUCT_ID: 0, // TODO: Replace with actual product ID

  /** Checkout URLs for each variant */
  CHECKOUT_URLS: {
    monthly: '', // TODO: e.g., 'https://yourstore.lemonsqueezy.com/buy/abc123'
    annual: '',  // TODO: e.g., 'https://yourstore.lemonsqueezy.com/buy/def456'
    lifetime: '', // TODO: optional
  },
} as const

// ── License Persistence ─────────────────────────────────────────────────

export const LICENSE_STORAGE_KEY = 'ktr-license'
export const LICENSE_INSTANCE_KEY = 'ktr-instance-id'

// ── Validation Intervals ────────────────────────────────────────────────

/** How often to re-validate the license key with the API (in milliseconds) */
export const REVALIDATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Grace period after expiration before locking features (in milliseconds) */
export const EXPIRATION_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

// ── Free Tier Limits ────────────────────────────────────────────────────

/** Maximum session duration for free tier (in milliseconds) */
export const FREE_SESSION_LIMIT_MS = 15 * 60 * 1000 // 15 minutes

/** Cooldown before free users can start a new session (in milliseconds) */
export const FREE_SESSION_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

/** Operation modes available in the free tier */
export const FREE_TIER_MODES = ['speech', 'liveMusic'] as const

/** All operation modes (for reference) */
export const ALL_MODES = [
  'speech', 'worship', 'liveMusic', 'theater',
  'monitors', 'ringOut', 'broadcast', 'outdoor',
] as const

// ── Default License State ───────────────────────────────────────────────

export const DEFAULT_LICENSE_DATA: LicenseData = {
  tier: 'free',
  status: 'inactive',
  licenseKey: null,
  instanceId: null,
  customerEmail: null,
  customerName: null,
  variantName: null,
  activatedAt: null,
  expiresAt: null,
  lastValidatedAt: null,
}

// ── Feature Gates ───────────────────────────────────────────────────────

export const FREE_FEATURE_GATES: ProFeatureGates = {
  allModes: false,
  peqRecommendations: false,
  roomAcoustics: false,
  feedbackHistory: false,
  eqNotepad: false,
  algorithmScoring: false,
  advancedSettings: false,
  dataExport: false,
  unlimitedSession: false,
  customRoomPresets: false,
  allFftSizes: false,
}

export const PRO_FEATURE_GATES: ProFeatureGates = {
  allModes: true,
  peqRecommendations: true,
  roomAcoustics: true,
  feedbackHistory: true,
  eqNotepad: true,
  algorithmScoring: true,
  advancedSettings: true,
  dataExport: true,
  unlimitedSession: true,
  customRoomPresets: true,
  allFftSizes: true,
}
```

---

## 5. Build the `useLicense` Hook

### Step 5.1: Create the License Validation Service

**File to create:** `lib/license/validate.ts`

```typescript
// lib/license/validate.ts

import { LEMONSQUEEZY_CONFIG } from './constants'
import type { LicenseValidationResponse } from '@/types/license'

/**
 * Validate a license key with the LemonSqueezy API.
 *
 * This is a client-safe call — it uses the license key itself for auth,
 * not your API key. The endpoint is designed for client-side use.
 */
export async function validateLicenseKey(
  licenseKey: string,
  instanceId?: string
): Promise<LicenseValidationResponse> {
  const body: Record<string, string> = { license_key: licenseKey }
  if (instanceId) {
    body.instance_id = instanceId
  }

  const response = await fetch(
    `${LEMONSQUEEZY_CONFIG.API_BASE}/validate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error || `Validation failed with status ${response.status}`
    )
  }

  return response.json()
}

/**
 * Activate a license key on this device.
 *
 * Creates a new "instance" (activation) for the key.
 * Returns an instance ID that must be stored for future validations.
 */
export async function activateLicenseKey(
  licenseKey: string,
  instanceName: string
): Promise<LicenseValidationResponse> {
  const response = await fetch(
    `${LEMONSQUEEZY_CONFIG.API_BASE}/activate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: instanceName,
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error || `Activation failed with status ${response.status}`
    )
  }

  return response.json()
}

/**
 * Deactivate a license key on this device.
 *
 * Frees up an activation slot for use on another device.
 */
export async function deactivateLicenseKey(
  licenseKey: string,
  instanceId: string
): Promise<void> {
  const response = await fetch(
    `${LEMONSQUEEZY_CONFIG.API_BASE}/deactivate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: instanceId,
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error || `Deactivation failed with status ${response.status}`
    )
  }
}

/**
 * Generate a unique instance name for this device/browser.
 * Uses a combination of user agent and a random ID for uniqueness.
 */
export function generateInstanceName(): string {
  const browser = navigator.userAgent.split(' ').pop()?.split('/')[0] || 'Browser'
  const randomId = Math.random().toString(36).substring(2, 8)
  return `KTR-${browser}-${randomId}`
}
```

### Step 5.2: Create the `useLicense` Hook

**File to create:** `hooks/useLicense.ts`

```typescript
// hooks/useLicense.ts

'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { LicenseData, LicenseStatus, ProFeatureGates } from '@/types/license'
import {
  LICENSE_STORAGE_KEY,
  DEFAULT_LICENSE_DATA,
  REVALIDATION_INTERVAL_MS,
  EXPIRATION_GRACE_PERIOD_MS,
  FREE_FEATURE_GATES,
  PRO_FEATURE_GATES,
} from '@/lib/license/constants'
import {
  validateLicenseKey,
  activateLicenseKey,
  deactivateLicenseKey,
  generateInstanceName,
} from '@/lib/license/validate'

export interface UseLicenseReturn {
  /** Current license data */
  license: LicenseData
  /** Computed feature gates based on license status */
  features: ProFeatureGates
  /** Whether the user has an active Pro license */
  isPro: boolean
  /** Whether a license operation is in progress */
  isLoading: boolean
  /** Error message from last operation */
  error: string | null
  /** Activate a license key */
  activate: (key: string) => Promise<boolean>
  /** Deactivate the current license (frees device slot) */
  deactivate: () => Promise<void>
  /** Manually trigger re-validation */
  revalidate: () => Promise<void>
  /** Clear the license entirely (reset to free) */
  clearLicense: () => void
}

function loadLicenseFromStorage(): LicenseData {
  if (typeof window === 'undefined') return DEFAULT_LICENSE_DATA
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY)
    if (!stored) return DEFAULT_LICENSE_DATA
    return { ...DEFAULT_LICENSE_DATA, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_LICENSE_DATA
  }
}

function saveLicenseToStorage(data: LicenseData): void {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function useLicense(): UseLicenseReturn {
  const [license, setLicense] = useState<LicenseData>(loadLicenseFromStorage)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const revalidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist license changes to localStorage
  useEffect(() => {
    saveLicenseToStorage(license)
  }, [license])

  // Determine if license is effectively active (including grace period)
  const isPro = useMemo(() => {
    if (license.status !== 'active' && license.status !== 'expired') return false
    if (license.status === 'active') return true

    // Check grace period for expired licenses
    if (license.expiresAt) {
      const expiresAt = new Date(license.expiresAt).getTime()
      const graceEnd = expiresAt + EXPIRATION_GRACE_PERIOD_MS
      return Date.now() < graceEnd
    }
    return false
  }, [license.status, license.expiresAt])

  // Compute feature gates
  const features = useMemo<ProFeatureGates>(
    () => (isPro ? PRO_FEATURE_GATES : FREE_FEATURE_GATES),
    [isPro]
  )

  // ── Activate ─────────────────────────────────────────────────────────

  const activate = useCallback(async (key: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const trimmedKey = key.trim()
      const instanceName = generateInstanceName()

      const result = await activateLicenseKey(trimmedKey, instanceName)

      if (!result.valid) {
        setError('License key is not valid. Please check and try again.')
        setIsLoading(false)
        return false
      }

      const newLicense: LicenseData = {
        tier: 'pro',
        status: 'active',
        licenseKey: trimmedKey,
        instanceId: result.instance?.id ?? null,
        customerEmail: result.meta.customer_email,
        customerName: result.meta.customer_name,
        variantName: result.meta.variant_name,
        activatedAt: new Date().toISOString(),
        expiresAt: result.license_key.expires_at,
        lastValidatedAt: new Date().toISOString(),
      }

      setLicense(newLicense)
      setIsLoading(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activation failed'
      setError(message)
      setIsLoading(false)
      return false
    }
  }, [])

  // ── Deactivate ────────────────────────────────────────────────────────

  const deactivate = useCallback(async () => {
    if (!license.licenseKey || !license.instanceId) return

    setIsLoading(true)
    setError(null)

    try {
      await deactivateLicenseKey(license.licenseKey, license.instanceId)
    } catch {
      // Best-effort deactivation — clear locally regardless
    }

    setLicense(DEFAULT_LICENSE_DATA)
    setIsLoading(false)
  }, [license.licenseKey, license.instanceId])

  // ── Revalidate ────────────────────────────────────────────────────────

  const revalidate = useCallback(async () => {
    if (!license.licenseKey) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await validateLicenseKey(
        license.licenseKey,
        license.instanceId ?? undefined
      )

      let newStatus: LicenseStatus = 'active'
      if (!result.valid) {
        newStatus = result.license_key.status === 'expired' ? 'expired' : 'disabled'
      }

      setLicense((prev) => ({
        ...prev,
        status: newStatus,
        expiresAt: result.license_key.expires_at,
        lastValidatedAt: new Date().toISOString(),
      }))
    } catch {
      // Network failure — keep current status, don't lock out
      setLicense((prev) => ({
        ...prev,
        status: prev.status === 'active' ? 'active' : 'error',
        lastValidatedAt: prev.lastValidatedAt, // Keep old timestamp
      }))
    }

    setIsLoading(false)
  }, [license.licenseKey, license.instanceId])

  // ── Clear ─────────────────────────────────────────────────────────────

  const clearLicense = useCallback(() => {
    setLicense(DEFAULT_LICENSE_DATA)
    setError(null)
    localStorage.removeItem(LICENSE_STORAGE_KEY)
  }, [])

  // ── Auto-Revalidation ─────────────────────────────────────────────────

  useEffect(() => {
    if (!license.licenseKey || license.status === 'inactive') return

    // Check if revalidation is due
    const lastValidated = license.lastValidatedAt
      ? new Date(license.lastValidatedAt).getTime()
      : 0
    const timeSinceValidation = Date.now() - lastValidated

    if (timeSinceValidation >= REVALIDATION_INTERVAL_MS) {
      revalidate()
    } else {
      // Schedule next revalidation
      const nextCheck = REVALIDATION_INTERVAL_MS - timeSinceValidation
      revalidationTimerRef.current = setTimeout(revalidate, nextCheck)
    }

    return () => {
      if (revalidationTimerRef.current) {
        clearTimeout(revalidationTimerRef.current)
      }
    }
  }, [license.licenseKey, license.status, license.lastValidatedAt, revalidate])

  return {
    license,
    features,
    isPro,
    isLoading,
    error,
    activate,
    deactivate,
    revalidate,
    clearLicense,
  }
}
```

---

## 6. Add the License Activation UI

### Step 6.1: Create the License Activation Dialog Component

**File to create:** `components/kill-the-ring/LicenseDialog.tsx`

```typescript
// components/kill-the-ring/LicenseDialog.tsx

'use client'

import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Crown, Check, X, Loader2, ExternalLink, KeyRound } from 'lucide-react'
import { LEMONSQUEEZY_CONFIG } from '@/lib/license/constants'
import type { UseLicenseReturn } from '@/hooks/useLicense'

interface LicenseDialogProps {
  license: UseLicenseReturn
  trigger?: React.ReactNode
}

export const LicenseDialog = memo(function LicenseDialog({
  license,
  trigger,
}: LicenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const { isPro, isLoading, error, activate, deactivate } = license
  const { status, customerEmail, variantName, activatedAt, expiresAt } = license.license

  const handleActivate = async () => {
    const success = await activate(keyInput)
    if (success) {
      setKeyInput('')
    }
  }

  const handleDeactivate = async () => {
    await deactivate()
    setKeyInput('')
  }

  const openCheckout = (variant: 'monthly' | 'annual' | 'lifetime') => {
    const url = LEMONSQUEEZY_CONFIG.CHECKOUT_URLS[variant]
    if (url) {
      // If using LemonSqueezy.js overlay, trigger it here instead
      // For now, open in new tab
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={isPro ? 'outline' : 'default'}
            size="sm"
            className={isPro
              ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
            }
          >
            <Crown className="w-4 h-4 mr-1" />
            {isPro ? 'Pro' : 'Upgrade'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            {isPro ? 'Pro License Active' : 'Upgrade to Pro'}
          </DialogTitle>
          <DialogDescription>
            {isPro
              ? 'Your Pro license is active on this device.'
              : 'Unlock all features with a Pro license key.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* ── Active License Info ─────────────────────────────── */}
          {isPro && (
            <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <Check className="w-4 h-4" />
                <span className="font-medium">License Active</span>
              </div>
              {customerEmail && (
                <p className="text-xs text-muted-foreground">
                  Licensed to: {customerEmail}
                </p>
              )}
              {variantName && (
                <p className="text-xs text-muted-foreground">
                  Plan: {variantName}
                </p>
              )}
              {expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Renews: {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
              {activatedAt && (
                <p className="text-xs text-muted-foreground">
                  Activated: {new Date(activatedAt).toLocaleDateString()}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-destructive mt-2"
              >
                Deactivate on this device
              </Button>
            </div>
          )}

          {/* ── License Key Input ──────────────────────────────── */}
          {!isPro && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Enter your license key
                </label>
                <div className="flex gap-2">
                  <Input
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="KTR-XXXX-XXXX-XXXX-XXXX"
                    className="font-mono text-sm"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keyInput.trim()) handleActivate()
                    }}
                  />
                  <Button
                    onClick={handleActivate}
                    disabled={!keyInput.trim() || isLoading}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {error}
                  </p>
                )}
              </div>

              {/* ── Divider ─────────────────────────────────────── */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or purchase a license
                  </span>
                </div>
              </div>

              {/* ── Purchase Options ───────────────────────────── */}
              <div className="space-y-2">
                {LEMONSQUEEZY_CONFIG.CHECKOUT_URLS.annual && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => openCheckout('annual')}
                  >
                    <span>
                      <span className="font-medium">Pro Annual</span>
                      <span className="text-muted-foreground ml-2">$49/year</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
                {LEMONSQUEEZY_CONFIG.CHECKOUT_URLS.monthly && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => openCheckout('monthly')}
                  >
                    <span>
                      <span className="font-medium">Pro Monthly</span>
                      <span className="text-muted-foreground ml-2">$6/month</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
                {LEMONSQUEEZY_CONFIG.CHECKOUT_URLS.lifetime && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => openCheckout('lifetime')}
                  >
                    <span>
                      <span className="font-medium">Pro Lifetime</span>
                      <span className="text-muted-foreground ml-2">$79 once</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* ── Pro Features List ──────────────────────────── */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2">
                <p className="font-medium text-foreground">Pro includes:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>All 8 operation modes (Worship, Theater, Monitors, etc.)</li>
                  <li>PEQ recommendations with filter type, Q, and gain</li>
                  <li>Room acoustics calculator (Schroeder, RT60, room modes)</li>
                  <li>Feedback history with repeat offender tracking</li>
                  <li>EQ Notepad for accumulating applied cuts</li>
                  <li>CSV/JSON data export</li>
                  <li>All FFT size options (4096/8192/16384)</li>
                  <li>Unlimited session length</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
```

### Step 6.2: Add LicenseDialog to the barrel export

**File to modify:** `components/kill-the-ring/index.ts`

Add this line:
```typescript
export { LicenseDialog } from "./LicenseDialog"
```

---

## 7. Integrate LemonSqueezy Checkout Overlay

### Step 7.1: Add the LemonSqueezy JavaScript SDK

The LemonSqueezy checkout overlay (`Lemon.js`) enables in-app purchase without redirecting the user away from your app.

**File to modify:** `app/layout.tsx`

Add the LemonSqueezy script to the `<head>`:

```typescript
// In the RootLayout component, add inside <head> or as a Script component:
import Script from 'next/script'

// Inside the return:
<html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
  <head>
    <Script
      src="https://assets.lemonsqueezy.com/lemon.js"
      strategy="lazyOnload"
    />
  </head>
  <body className="font-sans antialiased">
    {children}
  </body>
</html>
```

### Step 7.2: Create a LemonSqueezy Checkout Helper

**File to create:** `lib/license/checkout.ts`

```typescript
// lib/license/checkout.ts

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      /**
       * Open the checkout overlay for the given URL.
       * The URL must be a LemonSqueezy checkout link.
       */
      Url: {
        Open: (url: string) => void
        Close: () => void
      }
      /**
       * Listen for checkout events.
       */
      Setup: (config: {
        eventHandler: (event: LemonSqueezyEvent) => void
      }) => void
    }
  }
}

export interface LemonSqueezyEvent {
  event:
    | 'Checkout.Success'
    | 'Checkout.ViewCart'
    | 'Checkout.Close'
    | 'PaymentMethodUpdate.Created'
    | 'PaymentMethodUpdate.Updated'
  data?: {
    order?: {
      data?: {
        attributes?: {
          first_order_item?: {
            variant_name?: string
          }
        }
      }
    }
    // The license key is NOT directly available in checkout events.
    // It's delivered via email or webhook.
  }
}

/**
 * Initialize LemonSqueezy.js overlay.
 * Call this once after the page loads.
 */
export function initLemonSqueezy(
  onSuccess?: (event: LemonSqueezyEvent) => void
): void {
  if (typeof window === 'undefined') return

  // Initialize the Lemon.js library
  window.createLemonSqueezy?.()

  // Set up event listeners
  window.LemonSqueezy?.Setup({
    eventHandler: (event) => {
      if (event.event === 'Checkout.Success' && onSuccess) {
        onSuccess(event)
      }
    },
  })
}

/**
 * Open the LemonSqueezy checkout overlay.
 *
 * @param checkoutUrl - The LemonSqueezy checkout URL for the variant
 * @param email - Optional pre-fill email
 * @param discountCode - Optional discount code
 */
export function openCheckoutOverlay(
  checkoutUrl: string,
  email?: string,
  discountCode?: string
): void {
  if (!checkoutUrl) return

  // Build URL with optional params
  const url = new URL(checkoutUrl)
  if (email) url.searchParams.set('checkout[email]', email)
  if (discountCode) url.searchParams.set('checkout[discount_code]', discountCode)

  // Try overlay first, fall back to new tab
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(url.toString())
  } else {
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }
}
```

### Step 7.3: Update LicenseDialog to Use Overlay

Replace the `openCheckout` function in `LicenseDialog.tsx` with:

```typescript
import { openCheckoutOverlay } from '@/lib/license/checkout'

// Inside the component:
const openCheckout = (variant: 'monthly' | 'annual' | 'lifetime') => {
  const url = LEMONSQUEEZY_CONFIG.CHECKOUT_URLS[variant]
  if (url) {
    openCheckoutOverlay(url)
  }
}
```

---

## 8. Implement Feature Gating in Components

### Step 8.1: Pass License State Through the Component Tree

The `useLicense` hook should be called in `KillTheRing.tsx` (the main orchestrator) and passed down to child components that need gating.

**Modify:** `components/kill-the-ring/KillTheRing.tsx`

```typescript
// Add to imports:
import { useLicense } from '@/hooks/useLicense'
import { LicenseDialog } from './LicenseDialog'
import { FREE_TIER_MODES } from '@/lib/license/constants'

// Inside the component:
const license = useLicense()

// In the header, add the upgrade/pro button:
<LicenseDialog license={license} />
```

### Step 8.2: Gate Operation Modes

**Modify:** `components/kill-the-ring/DetectionControls.tsx`

Add a Pro badge on locked modes and prevent selection:

```typescript
// When rendering mode buttons:
const isModeLocked = !license.features.allModes && !FREE_TIER_MODES.includes(mode)

<Button
  variant={currentMode === mode ? 'default' : 'outline'}
  size="sm"
  onClick={() => !isModeLocked && onModeChange(mode)}
  disabled={isModeLocked}
  className={cn(
    isModeLocked && 'opacity-50 cursor-not-allowed'
  )}
>
  {modeLabel}
  {isModeLocked && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
</Button>
```

### Step 8.3: Gate Component Sections

For components that should be entirely hidden in free tier, use conditional rendering:

```typescript
// In KillTheRing.tsx, where panels are rendered:

{/* EQ Notepad — Pro only */}
{license.features.eqNotepad && (
  <EQNotepad
    pinnedCuts={pinnedCuts}
    onRemoveCut={handleRemoveCut}
    onClearAll={handleClearAllCuts}
  />
)}

{/* Feedback History — Pro only */}
{license.features.feedbackHistory && (
  <FeedbackHistoryPanel />
)}

{/* Algorithm Status Bar — Pro only */}
{license.features.algorithmScoring && (
  <AlgorithmStatusBar /* ...props */ />
)}
```

### Step 8.4: Gate Settings Tabs

**Modify:** `components/kill-the-ring/SettingsPanel.tsx`

```typescript
// When rendering settings tabs:
const settingsTabs = [
  { id: 'detection', label: 'Detection', locked: false },
  { id: 'algorithms', label: 'Algorithms', locked: !license.features.advancedSettings },
  { id: 'display', label: 'Display', locked: !license.features.advancedSettings },
  { id: 'room', label: 'Room', locked: !license.features.roomAcoustics },
  { id: 'advanced', label: 'Advanced', locked: !license.features.advancedSettings },
]

// Render with lock indicators:
{settingsTabs.map((tab) => (
  <TabsTrigger
    key={tab.id}
    value={tab.id}
    disabled={tab.locked}
    className={cn(tab.locked && 'opacity-50')}
  >
    {tab.label}
    {tab.locked && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
  </TabsTrigger>
))}
```

### Step 8.5: Gate Export Functionality

In any component with CSV/JSON export buttons:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handleExport}
  disabled={!license.features.dataExport}
>
  Export
  {!license.features.dataExport && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
</Button>
```

### Step 8.6: Create a ProGate Wrapper Component (Optional)

For cleaner gating throughout the app, create a reusable wrapper:

**File to create:** `components/kill-the-ring/ProGate.tsx`

```typescript
// components/kill-the-ring/ProGate.tsx

'use client'

import { memo, type ReactNode } from 'react'
import { Crown } from 'lucide-react'
import type { ProFeatureGates } from '@/types/license'

interface ProGateProps {
  feature: keyof ProFeatureGates
  features: ProFeatureGates
  children: ReactNode
  /** What to show when locked. Defaults to nothing. */
  fallback?: ReactNode
  /** If true, shows a "Pro" badge overlay instead of hiding */
  showLocked?: boolean
}

export const ProGate = memo(function ProGate({
  feature,
  features,
  children,
  fallback = null,
  showLocked = false,
}: ProGateProps) {
  const isUnlocked = features[feature]

  if (isUnlocked) return <>{children}</>

  if (showLocked) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
            <Crown className="w-3 h-3" />
            Pro
          </span>
        </div>
      </div>
    )
  }

  return <>{fallback}</>
})
```

**Usage:**

```tsx
<ProGate feature="feedbackHistory" features={license.features}>
  <FeedbackHistoryPanel />
</ProGate>

<ProGate feature="eqNotepad" features={license.features} showLocked>
  <EQNotepad pinnedCuts={pinnedCuts} />
</ProGate>
```

---

## 9. Add Pro Badge & Status Indicators

### Step 9.1: Header Pro Badge

Add a subtle Pro badge in the app header when the user has an active license:

```typescript
// In KillTheRing.tsx header area:
{license.isPro && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-500 border border-amber-500/30">
    <Crown className="w-2.5 h-2.5" />
    PRO
  </span>
)}
```

### Step 9.2: About Tab License Status

Add license info to the Help > About tab in `HelpMenu.tsx`:

```typescript
// In the About tab section:
<div className="space-y-2">
  <h4 className="text-sm font-medium">License</h4>
  {license.isPro ? (
    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
      <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
        <Crown className="w-3 h-3" /> Pro License Active
      </p>
      {license.license.variantName && (
        <p className="text-xs text-muted-foreground mt-1">
          Plan: {license.license.variantName}
        </p>
      )}
    </div>
  ) : (
    <div className="p-2 rounded bg-muted">
      <p className="text-xs text-muted-foreground">
        Free tier — <button className="text-primary underline" onClick={() => {/* open license dialog */}}>Upgrade to Pro</button>
      </p>
    </div>
  )}
</div>
```

---

## 10. Handle Session Time Limits (Free Tier)

### Step 10.1: Create the Session Timer Hook

**File to create:** `hooks/useSessionTimer.ts`

```typescript
// hooks/useSessionTimer.ts

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FREE_SESSION_LIMIT_MS, FREE_SESSION_COOLDOWN_MS } from '@/lib/license/constants'

interface UseSessionTimerReturn {
  /** Time remaining in the session (milliseconds) */
  remainingMs: number
  /** Whether the session has expired */
  isExpired: boolean
  /** Whether the user is in cooldown after expiration */
  isCooldown: boolean
  /** Formatted time remaining string (e.g., "12:34") */
  formattedRemaining: string
  /** Reset the session timer */
  resetTimer: () => void
}

export function useSessionTimer(
  isRunning: boolean,
  isUnlimited: boolean
): UseSessionTimerReturn {
  const [remainingMs, setRemainingMs] = useState(FREE_SESSION_LIMIT_MS)
  const [isExpired, setIsExpired] = useState(false)
  const [isCooldown, setIsCooldown] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Count down while running and not unlimited
  useEffect(() => {
    if (!isRunning || isUnlimited || isExpired) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          setIsExpired(true)
          setIsCooldown(true)
          // Start cooldown timer
          setTimeout(() => setIsCooldown(false), FREE_SESSION_COOLDOWN_MS)
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isUnlimited, isExpired])

  const resetTimer = useCallback(() => {
    setRemainingMs(FREE_SESSION_LIMIT_MS)
    setIsExpired(false)
  }, [])

  const formattedRemaining = formatMs(remainingMs)

  return { remainingMs, isExpired, isCooldown, formattedRemaining, resetTimer }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
```

### Step 10.2: Integrate Session Timer in KillTheRing

```typescript
// In KillTheRing.tsx:
import { useSessionTimer } from '@/hooks/useSessionTimer'

// Inside the component:
const sessionTimer = useSessionTimer(isRunning, license.features.unlimitedSession)

// When session expires, stop the analyzer:
useEffect(() => {
  if (sessionTimer.isExpired && isRunning) {
    stop()
  }
}, [sessionTimer.isExpired, isRunning, stop])

// Show timer in the UI for free users:
{!license.features.unlimitedSession && isRunning && (
  <span className={cn(
    'text-xs font-mono tabular-nums',
    sessionTimer.remainingMs < 120000 ? 'text-destructive' : 'text-muted-foreground'
  )}>
    {sessionTimer.formattedRemaining}
  </span>
)}

// Show expiration dialog:
{sessionTimer.isExpired && !license.isPro && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="text-center space-y-4 p-6 max-w-sm">
      <Crown className="w-12 h-12 text-amber-500 mx-auto" />
      <h2 className="text-lg font-semibold">Session Limit Reached</h2>
      <p className="text-sm text-muted-foreground">
        Free sessions are limited to 15 minutes.
        Upgrade to Pro for unlimited session length.
      </p>
      <div className="flex gap-2 justify-center">
        <LicenseDialog license={license} />
        <Button
          variant="outline"
          onClick={() => sessionTimer.resetTimer()}
          disabled={sessionTimer.isCooldown}
        >
          {sessionTimer.isCooldown ? 'Wait 2 min...' : 'New Session'}
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## 11. Add Webhook Handler for Server-Side Validation (Optional)

If you want server-side verification (recommended for production), add a Next.js API route.

### Step 11.1: Create the Webhook API Route

**File to create:** `app/api/webhooks/lemonsqueezy/route.ts`

```typescript
// app/api/webhooks/lemonsqueezy/route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

/**
 * Verify the webhook signature from LemonSqueezy.
 * This ensures the request is genuinely from LemonSqueezy.
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  )
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') || ''
  const eventName = request.headers.get('x-event-name') || ''

  // Verify signature
  if (WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  // Handle relevant events
  switch (eventName) {
    case 'license_key_created':
      // A new license was purchased
      // Log for analytics, send welcome email, etc.
      console.log('New license created:', payload.data?.attributes?.key)
      break

    case 'license_key_updated':
      // License was updated (could be disabled/expired)
      console.log('License updated:', payload.data?.attributes?.key)
      break

    case 'subscription_cancelled':
      // Subscription was cancelled — license will expire at end of period
      console.log('Subscription cancelled:', payload.data?.id)
      break

    case 'subscription_expired':
      // Subscription expired — license should be revoked
      console.log('Subscription expired:', payload.data?.id)
      break

    case 'order_refunded':
      // Order was refunded — consider disabling the license
      console.log('Order refunded:', payload.data?.id)
      break
  }

  return NextResponse.json({ received: true })
}
```

### Step 11.2: Configure Webhook in LemonSqueezy

1. Go to **Settings → Webhooks → Add Webhook**
2. Configure:
   - **URL:** `https://your-domain.vercel.app/api/webhooks/lemonsqueezy`
   - **Secret:** Generate a random string and set as `LEMONSQUEEZY_WEBHOOK_SECRET` env var
   - **Events:** Select:
     - `license_key_created`
     - `license_key_updated`
     - `subscription_cancelled`
     - `subscription_expired`
     - `order_refunded`

### Step 11.3: Add Environment Variable

```bash
# .env.local (do not commit this file)
LEMONSQUEEZY_WEBHOOK_SECRET=your_random_secret_string_here
```

---

## 12. Testing the Full Flow

### Step 12.1: LemonSqueezy Test Mode

LemonSqueezy has a built-in **test mode**:

1. Go to **Settings → General → Test Mode** toggle
2. When enabled, all purchases use test card numbers:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date
   - **CVC:** Any 3 digits
3. Test mode generates real license keys that work with the API
4. No real charges are made

### Step 12.2: Test Checklist

Run through each of these scenarios:

```
[ ] Free Tier Experience
    [ ] App loads with free tier active
    [ ] Only Speech and Live Music modes available
    [ ] Other modes show crown/lock icon
    [ ] PEQ recommendations hidden
    [ ] Room acoustics tab locked in settings
    [ ] Feedback history panel hidden
    [ ] EQ Notepad hidden
    [ ] Export buttons disabled
    [ ] 15-minute session timer counts down
    [ ] Session expires and shows upgrade dialog
    [ ] 2-minute cooldown enforced after expiration
    [ ] Can start new session after cooldown

[ ] Purchase Flow
    [ ] "Upgrade" button visible in header
    [ ] License dialog opens with purchase options
    [ ] Checkout links open LemonSqueezy overlay (or new tab)
    [ ] Purchase completes successfully (test mode)
    [ ] License key received via email

[ ] License Activation
    [ ] Can enter license key in dialog
    [ ] Invalid key shows error message
    [ ] Valid key activates successfully
    [ ] Pro badge appears in header
    [ ] All features unlocked immediately
    [ ] License data persists after page reload
    [ ] License data persists after browser restart

[ ] License Management
    [ ] License info shown in dialog (email, plan, dates)
    [ ] "Deactivate" button works
    [ ] After deactivation, reverts to free tier
    [ ] Can re-activate on same device
    [ ] License validation works after 7-day interval

[ ] Edge Cases
    [ ] Works offline after initial activation
    [ ] Handles network errors gracefully during validation
    [ ] Expired license shows appropriate messaging
    [ ] Grace period (3 days) works after expiration
    [ ] Multiple tabs don't conflict via localStorage
```

### Step 12.3: Browser Testing Matrix

```
[ ] Chrome Desktop (primary)
[ ] Firefox Desktop
[ ] Safari Desktop (macOS)
[ ] Chrome Android (PWA)
[ ] Safari iOS (PWA)
[ ] Edge Desktop
```

---

## 13. Launch Checklist

### Pre-Launch

```
[ ] LemonSqueezy account fully set up
    [ ] Store details complete
    [ ] Tax information submitted
    [ ] Payout method configured
    [ ] Product created with variants
    [ ] License key settings configured
    [ ] Webhook configured (if using)

[ ] Code implementation complete
    [ ] types/license.ts created
    [ ] lib/license/constants.ts created with real IDs
    [ ] lib/license/validate.ts created
    [ ] lib/license/checkout.ts created
    [ ] hooks/useLicense.ts created
    [ ] hooks/useSessionTimer.ts created
    [ ] LicenseDialog component created
    [ ] ProGate component created (optional)
    [ ] Feature gating applied to all components
    [ ] Session timer integrated
    [ ] Lemon.js script added to layout

[ ] Build verification
    [ ] npx tsc --noEmit passes
    [ ] pnpm build succeeds
    [ ] No console errors in browser
    [ ] PWA still works (service worker)

[ ] Testing complete
    [ ] All test checklist items pass (Section 12.2)
    [ ] All browsers tested (Section 12.3)
    [ ] Test mode purchases verified
```

### Launch Day

```
[ ] Switch LemonSqueezy from test mode to live mode
[ ] Update checkout URLs in constants.ts (they change between test/live)
[ ] Deploy to production
[ ] Make one real test purchase yourself
[ ] Verify real license activation works
[ ] Monitor LemonSqueezy dashboard for first sales
```

### Post-Launch

```
[ ] Monitor error rates (browser console, Vercel logs)
[ ] Track conversion rates (free → pro)
[ ] Collect user feedback on pricing/feature split
[ ] Consider adjusting free tier limits based on data
[ ] Plan Phase 2 features (session recording, PDF reports)
```

---

## Appendix: LemonSqueezy API Reference

### License Key API Endpoints

All three endpoints are **client-safe** — they authenticate via the license key itself, not your API key.

#### Validate a License Key

```
POST https://api.lemonsqueezy.com/v1/licenses/validate

Request Body (JSON):
{
  "license_key": "KTR-XXXX-XXXX-XXXX-XXXX",
  "instance_id": "optional-instance-id"  // Include after activation
}

Response (200 OK):
{
  "valid": true,
  "error": null,
  "license_key": {
    "id": 1234,
    "status": "active",           // "active", "inactive", "expired", "disabled"
    "key": "KTR-XXXX-XXXX-XXXX-XXXX",
    "activation_limit": 3,
    "activation_usage": 1,
    "created_at": "2026-03-07T00:00:00.000000Z",
    "expires_at": "2027-03-07T00:00:00.000000Z",
    "test_mode": false
  },
  "instance": {
    "id": "inst_abc123",
    "name": "KTR-Chrome-x7k2m9",
    "created_at": "2026-03-07T00:00:00.000000Z"
  },
  "meta": {
    "store_id": 12345,
    "order_id": 67890,
    "order_item_id": 11111,
    "product_id": 22222,
    "product_name": "Kill The Ring Pro",
    "variant_id": 33333,
    "variant_name": "Pro Annual",
    "customer_id": 44444,
    "customer_name": "John Smith",
    "customer_email": "john@example.com"
  }
}

Error Response (400):
{
  "valid": false,
  "error": "license_key not found"
}
```

#### Activate a License Key

```
POST https://api.lemonsqueezy.com/v1/licenses/activate

Request Body (JSON):
{
  "license_key": "KTR-XXXX-XXXX-XXXX-XXXX",
  "instance_name": "KTR-Chrome-x7k2m9"   // Human-readable device name
}

Response: Same as validate, but creates a new instance.

Error (400) if activation_limit reached:
{
  "valid": false,
  "error": "Activation limit has been reached"
}
```

#### Deactivate a License Key

```
POST https://api.lemonsqueezy.com/v1/licenses/deactivate

Request Body (JSON):
{
  "license_key": "KTR-XXXX-XXXX-XXXX-XXXX",
  "instance_id": "inst_abc123"
}

Response (200 OK):
{
  "deactivated": true
}
```

### Webhook Event Payloads

#### `license_key_created`

```json
{
  "meta": {
    "event_name": "license_key_created",
    "custom_data": {}
  },
  "data": {
    "type": "license-keys",
    "id": "1234",
    "attributes": {
      "store_id": 12345,
      "order_id": 67890,
      "order_item_id": 11111,
      "product_id": 22222,
      "user_name": "John Smith",
      "user_email": "john@example.com",
      "key": "KTR-XXXX-XXXX-XXXX-XXXX",
      "key_short": "KTR-XXXX",
      "activation_limit": 3,
      "instances_count": 0,
      "disabled": false,
      "status": "active",
      "status_formatted": "Active",
      "expires_at": "2027-03-07T00:00:00.000000Z",
      "created_at": "2026-03-07T00:00:00.000000Z"
    }
  }
}
```

### LemonSqueezy Fees

| Fee Type | Amount |
|----------|--------|
| Transaction fee | 5% + $0.50 per transaction |
| Subscription fee | $0/month (no monthly platform fee) |
| Payout fee | Free (direct deposit) |
| Tax handling | Included (Merchant of Record) |
| Chargebacks | $15 per dispute |

### Comparison: LemonSqueezy vs Alternatives

| Feature | LemonSqueezy | Gumroad | Stripe |
|---------|-------------|---------|--------|
| License keys built-in | Yes | No | No |
| Merchant of Record (handles tax) | Yes | Yes | No |
| Transaction fees | 5% + $0.50 | 10% | 2.9% + $0.30 |
| Monthly fee | $0 | $0 | $0 |
| Checkout overlay | Yes | Yes | Yes (Checkout) |
| Subscriptions | Yes | Yes | Yes |
| Client-safe license API | Yes | No | No |
| Requires backend | No | No | Yes |

LemonSqueezy is recommended for Kill The Ring because:
1. Built-in license key generation and validation
2. Client-safe API (no backend required)
3. Handles sales tax/VAT as Merchant of Record
4. Simple checkout overlay integration
5. No monthly fee — only pay per transaction

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `types/license.ts` | License-related TypeScript interfaces |
| `lib/license/constants.ts` | LemonSqueezy config, feature gates, free tier limits |
| `lib/license/validate.ts` | API calls to LemonSqueezy (validate, activate, deactivate) |
| `lib/license/checkout.ts` | LemonSqueezy.js overlay integration |
| `hooks/useLicense.ts` | Main license state management hook |
| `hooks/useSessionTimer.ts` | Free tier session time limit |
| `components/kill-the-ring/LicenseDialog.tsx` | License activation and purchase UI |
| `components/kill-the-ring/ProGate.tsx` | Reusable feature gating wrapper |
| `app/api/webhooks/lemonsqueezy/route.ts` | Webhook handler (optional) |

### Files to Modify

| File | Changes |
|------|---------|
| `components/kill-the-ring/index.ts` | Add LicenseDialog and ProGate exports |
| `components/kill-the-ring/KillTheRing.tsx` | Add useLicense hook, LicenseDialog, feature gates, session timer |
| `components/kill-the-ring/DetectionControls.tsx` | Gate locked operation modes |
| `components/kill-the-ring/SettingsPanel.tsx` | Gate advanced settings tabs |
| `components/kill-the-ring/HelpMenu.tsx` | Add license status to About tab |
| `components/kill-the-ring/FeedbackHistoryPanel.tsx` | Gate export buttons |
| `app/layout.tsx` | Add LemonSqueezy.js script tag |

### Estimated Implementation Time

| Phase | Tasks | Estimate |
|-------|-------|----------|
| LemonSqueezy setup | Account, product, variants, API keys | 1-2 hours |
| Types & constants | Create type definitions and config | 30 minutes |
| License hook & validation | useLicense, validate.ts | 2-3 hours |
| License UI | LicenseDialog, ProGate | 2-3 hours |
| Feature gating | Modify 5-6 existing components | 3-4 hours |
| Session timer | useSessionTimer, integration | 1-2 hours |
| Testing | Full test checklist | 2-3 hours |
| **Total** | | **12-18 hours** |

---

*Document created: 2026-03-07*
*Applies to Kill The Ring v1.0.105*
*LemonSqueezy API reference as of March 2026*
