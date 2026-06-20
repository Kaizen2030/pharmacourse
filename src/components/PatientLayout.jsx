/* eslint-disable react-refresh/only-export-components */
import { createContext, createElement, useContext, useEffect, useState } from "react"
import { Link, NavLink, Outlet, useSearchParams } from "react-router-dom"
import { Building2, CalendarDays, ClipboardList, House, PackageSearch } from "lucide-react"
import { fetchPatientPortalPharmacyById } from "../lib/patientPortalDirectory"
import { buildSupabaseAccessBlockedCopy, isSupabaseAccessBlocked } from "../lib/supabaseAccess"
import PatientInstallPrompt from "./PatientInstallPrompt"
import PatientPortal from "../pages/PatientPortal"

const PatientContext = createContext(null)

const tabs = [
  { to: "/patient", label: "Home", icon: House },
  { to: "/patient/prescription", label: "Prescriptions", icon: ClipboardList },
  { to: "/patient/appointment", label: "Book", icon: CalendarDays },
  { to: "/patient/track", label: "Track", icon: PackageSearch },
]

export function usePatient() {
  const context = useContext(PatientContext)

  if (!context) {
    throw new Error("usePatient must be used within PatientLayout")
  }

  return context
}

export function PatientPortalStyles() {
  return (
    <style>{`
      .patient-shell {
        min-height: 100dvh;
        background:
          radial-gradient(circle at top left, rgba(15, 110, 86, 0.16), transparent 28%),
          radial-gradient(circle at bottom right, rgba(15, 110, 86, 0.1), transparent 26%),
          linear-gradient(180deg, #f4fbf8 0%, #eff7f4 100%);
        color: #163329;
      }

      .patient-missing,
      .patient-loading-screen {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
      }

      .patient-missing-card,
      .patient-loading-card {
        width: min(100%, 420px);
        padding: 2rem 1.4rem;
        border-radius: 28px;
        border: 1px solid rgba(15, 110, 86, 0.14);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 24px 55px rgba(15, 42, 32, 0.12);
        text-align: center;
      }

      .patient-missing-card svg,
      .patient-loading-card svg {
        width: 52px;
        height: 52px;
        margin: 0 auto 1rem;
        color: #0f6e56;
      }

      .patient-missing-card h1,
      .patient-loading-card h1 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }

      .patient-missing-card p,
      .patient-loading-card p {
        color: #5f746b;
      }

      .patient-topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1rem 0.85rem;
        background: rgba(244, 251, 248, 0.94);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(15, 110, 86, 0.1);
      }

      .patient-topbar-copy {
        min-width: 0;
      }

      .patient-topbar-label {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-bottom: 0.22rem;
        color: #0f6e56;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .patient-topbar-label svg {
        width: 14px;
        height: 14px;
      }

      .patient-topbar-name {
        font-size: 1rem;
        font-weight: 800;
        color: #163329;
        line-height: 1.25;
      }

      .patient-topbar-meta {
        margin-top: 0.2rem;
        font-size: 0.82rem;
        color: #5f746b;
      }

      .patient-powered {
        flex-shrink: 0;
        color: #7f9189;
        font-size: 0.76rem;
        font-weight: 700;
        text-align: right;
      }

      .patient-main {
        width: min(100%, 760px);
        margin: 0 auto;
        padding: 1rem 1rem 6.8rem;
      }

      .patient-branch-lock {
        display: grid;
        gap: 0.28rem;
        margin-bottom: 1rem;
        padding: 0.95rem 1rem;
        border-radius: 20px;
        border: 1px solid rgba(15, 110, 86, 0.14);
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241, 250, 246, 0.94));
        box-shadow: 0 10px 24px rgba(15, 42, 32, 0.05);
      }

      .patient-branch-lock-title {
        color: #0f6e56;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .patient-branch-lock-copy {
        color: #24463a;
        font-size: 0.92rem;
        line-height: 1.55;
      }

      .patient-branch-lock-copy strong {
        color: #163329;
      }

      .patient-install-card {
        display: grid;
        gap: 0.95rem;
        margin-bottom: 1rem;
        padding: 1rem;
        border-radius: 22px;
        border: 1px solid rgba(15, 110, 86, 0.14);
        background:
          radial-gradient(circle at top right, rgba(15, 110, 86, 0.1), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239, 248, 244, 0.96));
        box-shadow: 0 18px 42px rgba(15, 42, 32, 0.1);
      }

      .patient-install-card-popover {
        position: sticky;
        top: 0.85rem;
        z-index: 8;
        overflow: hidden;
        isolation: isolate;
        animation: patient-install-pop 180ms ease-out;
      }

      .patient-install-card-popover::after {
        content: "";
        position: absolute;
        inset: -20% auto auto -12%;
        width: 8rem;
        height: 8rem;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(15, 110, 86, 0.14), rgba(15, 110, 86, 0));
        pointer-events: none;
        z-index: -1;
      }

      .patient-install-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
      }

      .patient-install-icon,
      .patient-install-close {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .patient-install-icon {
        background: rgba(15, 110, 86, 0.1);
        color: #0f6e56;
      }

      .patient-install-icon svg,
      .patient-install-close svg {
        width: 18px;
        height: 18px;
      }

      .patient-install-close {
        border: none;
        background: rgba(255, 255, 255, 0.8);
        color: #6b7f76;
        cursor: pointer;
      }

      .patient-install-copy h2 {
        margin: 0.2rem 0 0.35rem;
        font-size: 1.08rem;
      }

      .patient-install-copy p,
      .patient-install-ios-row span {
        color: #5f746b;
        font-size: 0.92rem;
        line-height: 1.55;
      }

      .patient-install-kicker {
        color: #0f6e56;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .patient-install-actions {
        display: grid;
        gap: 0.65rem;
      }

      .patient-install-actions .patient-button,
      .patient-install-actions .patient-button-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
      }

      .patient-install-actions .patient-button svg,
      .patient-install-ios-row svg {
        width: 18px;
        height: 18px;
      }

      .patient-install-ios {
        display: grid;
        gap: 0.65rem;
      }

      @keyframes patient-install-pop {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.99);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .patient-install-ios-row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.78rem 0.9rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(15, 110, 86, 0.08);
        color: #0f6e56;
      }

      .patient-page {
        display: grid;
        gap: 1rem;
      }

      .patient-card {
        padding: 1.1rem;
        border-radius: 24px;
        border: 1px solid rgba(15, 110, 86, 0.12);
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 14px 34px rgba(15, 42, 32, 0.07);
      }

      .patient-card-muted {
        background:
          radial-gradient(circle at top right, rgba(15, 110, 86, 0.1), transparent 34%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 251, 248, 0.96));
      }

      .patient-hero h1,
      .patient-section-title,
      .patient-card h2 {
        margin: 0;
      }

      .patient-hero h1 {
        font-size: clamp(1.75rem, 4vw, 2.3rem);
        margin-bottom: 0.45rem;
      }

      .patient-hero p,
      .patient-copy,
      .patient-empty,
      .patient-form-help,
      .patient-muted {
        color: #5f746b;
      }

      .patient-copy strong {
        color: #163329;
      }

      .patient-actions-grid {
        display: grid;
        gap: 0.9rem;
      }

      .patient-action-card {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.9rem;
        padding: 1rem;
        border-radius: 22px;
        border: 1px solid rgba(15, 110, 86, 0.12);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 250, 247, 0.95));
        color: inherit;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }

      .patient-action-card:hover {
        transform: translateY(-1px);
        border-color: rgba(15, 110, 86, 0.24);
        box-shadow: 0 14px 32px rgba(15, 42, 32, 0.08);
      }

      .patient-action-icon,
      .patient-empty-icon,
      .patient-inline-icon {
        width: 48px;
        height: 48px;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 110, 86, 0.1);
        color: #0f6e56;
        flex-shrink: 0;
      }

      .patient-action-icon svg,
      .patient-empty-icon svg,
      .patient-inline-icon svg {
        width: 22px;
        height: 22px;
      }

      .patient-action-content h2,
      .patient-action-content h3 {
        font-size: 1rem;
        margin-bottom: 0.2rem;
      }

      .patient-action-content p,
      .patient-list-meta,
      .patient-note-time,
      .patient-chip-row,
      .patient-info-list,
      .patient-timeline-caption {
        color: #5f746b;
      }

      .patient-action-arrow {
        color: #0f6e56;
        font-size: 1.35rem;
        font-weight: 700;
      }

      .patient-form {
        display: grid;
        gap: 1rem;
      }

      .patient-form-row,
      .patient-grid-2 {
        display: grid;
        gap: 0.9rem;
      }

      .patient-form-group {
        display: grid;
        gap: 0.42rem;
      }

      .patient-auth-status {
        display: grid;
        gap: 0.8rem;
        justify-items: start;
      }

      .patient-inline-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        width: 100%;
      }

      .patient-label {
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #24463a;
      }

      .patient-input,
      .patient-textarea,
      .patient-select {
        width: 100%;
        border: 1px solid rgba(15, 110, 86, 0.14);
        border-radius: 16px;
        padding: 0.88rem 0.95rem;
        background: #fff;
        color: #163329;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .patient-input:focus,
      .patient-textarea:focus,
      .patient-select:focus {
        outline: none;
        border-color: rgba(15, 110, 86, 0.4);
        box-shadow: 0 0 0 4px rgba(15, 110, 86, 0.1);
      }

      .patient-textarea {
        min-height: 120px;
        resize: vertical;
      }

      .patient-button,
      .patient-button-secondary {
        min-height: 48px;
        border: none;
        border-radius: 999px;
        padding: 0.88rem 1.15rem;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }

      .patient-button:hover,
      .patient-button-secondary:hover {
        transform: translateY(-1px);
      }

      .patient-button:disabled,
      .patient-button-secondary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      .patient-button {
        background: linear-gradient(135deg, #0f6e56, #129474);
        color: #fff;
        box-shadow: 0 12px 28px rgba(15, 110, 86, 0.2);
      }

      .patient-button-secondary {
        background: rgba(15, 110, 86, 0.08);
        color: #0f6e56;
      }

      .patient-button-inline {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-height: 44px;
      }

      .patient-message,
      .patient-inline-message {
        padding: 0.92rem 1rem;
        border-radius: 18px;
        font-size: 0.94rem;
        border: 1px solid transparent;
      }

      .patient-message-success,
      .patient-inline-success {
        background: rgba(15, 110, 86, 0.1);
        border-color: rgba(15, 110, 86, 0.16);
        color: #0a4e3d;
      }

      .patient-message-error,
      .patient-inline-error {
        background: rgba(220, 38, 38, 0.08);
        border-color: rgba(220, 38, 38, 0.14);
        color: #b42318;
      }

      .patient-message-info,
      .patient-inline-info {
        background: rgba(26, 107, 181, 0.08);
        border-color: rgba(26, 107, 181, 0.14);
        color: #14508a;
      }

      .patient-checkbox-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .patient-checkbox {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.82rem 0.9rem;
        border: 1px solid rgba(15, 110, 86, 0.12);
        border-radius: 16px;
        background: rgba(15, 110, 86, 0.03);
      }

      .patient-checkbox input {
        width: 18px;
        height: 18px;
        accent-color: #0f6e56;
      }

      .patient-badge,
      .patient-status-badge,
      .patient-type-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.72rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .patient-badge {
        background: rgba(15, 110, 86, 0.1);
        color: #0f6e56;
      }

      .patient-status-pending {
        background: rgba(217, 119, 6, 0.12);
        color: #a85b06;
      }

      .patient-status-packed,
      .patient-status-confirmed {
        background: rgba(26, 107, 181, 0.12);
        color: #14508a;
      }

      .patient-status-dispatched,
      .patient-status-ready {
        background: rgba(15, 110, 86, 0.12);
        color: #0a4e3d;
      }

      .patient-status-delivered,
      .patient-status-completed {
        background: rgba(22, 163, 74, 0.12);
        color: #166534;
      }

      .patient-status-cancelled,
      .patient-status-rejected {
        background: rgba(220, 38, 38, 0.1);
        color: #b42318;
      }

      .patient-status-default {
        background: rgba(95, 116, 107, 0.12);
        color: #40584e;
      }

      .patient-list {
        display: grid;
        gap: 0.85rem;
      }

      .patient-list-item {
        padding: 1rem;
        border-radius: 20px;
        border: 1px solid rgba(15, 110, 86, 0.1);
        background: rgba(248, 252, 250, 0.9);
      }

      .patient-list-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.4rem;
      }

      .patient-list-title {
        font-size: 1rem;
        font-weight: 800;
      }

      .patient-list-text {
        color: #24463a;
        font-size: 0.95rem;
      }

      .patient-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        margin-top: 0.7rem;
      }

      .patient-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.38rem 0.7rem;
        border-radius: 999px;
        background: rgba(15, 110, 86, 0.08);
        color: #24463a;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .patient-radio-grid {
        display: grid;
        gap: 0.75rem;
      }

      .patient-radio {
        position: relative;
      }

      .patient-radio input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .patient-radio-card {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.8rem;
        align-items: center;
        padding: 1rem;
        border-radius: 20px;
        border: 1px solid rgba(15, 110, 86, 0.12);
        background: rgba(255, 255, 255, 0.94);
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }

      .patient-radio input:checked + .patient-radio-card {
        border-color: rgba(15, 110, 86, 0.3);
        background: rgba(15, 110, 86, 0.08);
        box-shadow: 0 12px 28px rgba(15, 42, 32, 0.08);
      }

      .patient-slot-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .patient-slot {
        min-height: 46px;
        border-radius: 16px;
        border: 1px solid rgba(15, 110, 86, 0.14);
        background: #fff;
        color: #24463a;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
      }

      .patient-slot:hover {
        border-color: rgba(15, 110, 86, 0.3);
      }

      .patient-slot.active {
        border-color: transparent;
        background: #0f6e56;
        color: #fff;
      }

      .patient-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.8rem;
      }

      .patient-section-header-tight {
        align-items: end;
        margin-bottom: 0.55rem;
      }

      .patient-section-title {
        font-size: 1.08rem;
      }

      .patient-drug-stack {
        display: grid;
        gap: 0.75rem;
      }

      .patient-drug-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.7rem;
        align-items: center;
      }

      .patient-drug-remove {
        white-space: nowrap;
      }

      .patient-empty-state {
        display: grid;
        justify-items: start;
        gap: 0.8rem;
      }

      .patient-note-item,
      .patient-tracking-grid {
        display: grid;
        gap: 0.8rem;
      }

      .patient-note-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.4rem;
      }

      .patient-note-message {
        color: #24463a;
        font-size: 0.95rem;
      }

      .patient-info-list {
        display: grid;
        gap: 0.3rem;
        margin-top: 0.5rem;
        font-size: 0.88rem;
      }

      .patient-timeline {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.65rem;
        margin-top: 0.9rem;
      }

      .patient-timeline-step {
        flex: 1;
        display: grid;
        justify-items: center;
        gap: 0.42rem;
        text-align: center;
      }

      .patient-timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        border: 2px solid rgba(15, 110, 86, 0.15);
        background: #fff;
      }

      .patient-timeline-step.complete .patient-timeline-dot {
        border-color: #0f6e56;
        background: #0f6e56;
      }

      .patient-timeline-step.current .patient-timeline-dot {
        border-color: #d97706;
        background: #f59e0b;
      }

      .patient-timeline-line {
        flex: 1;
        height: 2px;
        margin-top: 7px;
        background: rgba(15, 110, 86, 0.12);
      }

      .patient-bottom-nav {
        position: fixed;
        left: 50%;
        bottom: 0.9rem;
        transform: translateX(-50%);
        width: min(calc(100% - 1rem), 760px);
        padding: 0.5rem;
        border-radius: 999px;
        border: 1px solid rgba(15, 110, 86, 0.12);
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(16px);
        box-shadow: 0 16px 38px rgba(15, 42, 32, 0.12);
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.35rem;
      }

      .patient-tab {
        min-height: 56px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        gap: 0.2rem;
        color: #5f746b;
        font-size: 0.74rem;
        font-weight: 800;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      }

      .patient-tab svg {
        width: 18px;
        height: 18px;
      }

      .patient-tab.active {
        background: #0f6e56;
        color: #fff;
        transform: translateY(-1px);
      }

      .patient-refresh {
        color: #5f746b;
        font-size: 0.8rem;
        font-weight: 700;
      }

      @media (min-width: 720px) {
        .patient-topbar {
          padding-inline: max(1.2rem, calc((100vw - 760px) / 2 + 1rem));
        }

        .patient-main {
          padding-top: 1.25rem;
        }

        .patient-actions-grid,
        .patient-grid-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .patient-radio-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .patient-slot-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .patient-topbar {
          align-items: flex-start;
          flex-direction: column;
          padding-bottom: 0.8rem;
        }

        .patient-powered {
          text-align: left;
        }

        .patient-main {
          padding: 0.85rem 0.8rem 6.6rem;
        }

        .patient-card {
          padding: 1rem;
          border-radius: 20px;
        }

        .patient-hero h1 {
          font-size: 1.55rem;
        }

        .patient-checkbox-grid,
        .patient-slot-grid {
          grid-template-columns: 1fr;
        }

        .patient-list-header,
        .patient-note-header,
        .patient-section-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .patient-inline-actions > * {
          width: 100%;
        }

        .patient-drug-row {
          grid-template-columns: 1fr;
        }

        .patient-drug-remove {
          width: 100%;
        }

        .patient-bottom-nav {
          width: calc(100% - 0.8rem);
          bottom: 0.4rem;
        }

        .patient-tab {
          min-height: 54px;
          font-size: 0.68rem;
        }
      }

      .patient-shell {
        background:
          linear-gradient(180deg, #f5faf7 0%, #edf6f2 100%);
      }

      .patient-topbar {
        background: rgba(247, 252, 249, 0.96);
        border-bottom: 1px solid rgba(15, 110, 86, 0.08);
      }

      .patient-main {
        width: min(100%, 820px);
      }

      .patient-card,
      .patient-missing-card,
      .patient-loading-card,
      .patient-branch-lock,
      .patient-install-card,
      .patient-list-item,
      .patient-radio-card {
        border-radius: 14px;
      }

      .patient-card {
        border: 0.5px solid #e5e7eb;
        box-shadow: 0 10px 28px rgba(15, 42, 32, 0.06);
      }

      .patient-card-muted,
      .patient-branch-lock,
      .patient-install-card,
      .patient-action-card,
      .patient-list-item {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 248, 0.98));
      }

      .patient-hero {
        display: grid;
        gap: 0.8rem;
      }

      .patient-hero h1 {
        font-size: clamp(1.6rem, 4vw, 2.2rem);
        line-height: 1.1;
      }

      .patient-copy {
        font-size: 0.98rem;
        line-height: 1.6;
      }

      .patient-branch-lock {
        gap: 0.45rem;
        padding: 0.9rem 1rem;
      }

      .patient-actions-grid {
        gap: 0.8rem;
      }

      .patient-action-card {
        border-radius: 14px;
        border: 0.5px solid #e5e7eb;
        padding: 1rem;
        text-decoration: none;
      }

      .patient-action-content h2,
      .patient-action-content h3 {
        font-size: 0.98rem;
        line-height: 1.3;
      }

      .patient-action-content p {
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .patient-action-icon,
      .patient-empty-icon,
      .patient-inline-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
      }

      .patient-input,
      .patient-textarea,
      .patient-select {
        border-radius: 14px;
        border: 0.5px solid #d7e1dc;
        background: #ffffff;
      }

      .patient-button,
      .patient-button-secondary {
        min-height: 48px;
        border-radius: 999px;
      }

      .patient-button {
        background: #0F6E56;
      }

      .patient-button-secondary {
        background: #ffffff;
        border: 0.5px solid rgba(15, 110, 86, 0.22);
      }

      .patient-message,
      .patient-inline-message {
        border-radius: 14px;
      }

      .patient-section-header {
        margin-bottom: 0.9rem;
      }

      .patient-section-title {
        font-size: 1.02rem;
      }

      .patient-auth-status {
        padding: 0.95rem 1rem;
        border-radius: 14px;
        border: 0.5px solid #d7e1dc;
        background: #fbfefd;
      }

      .patient-session-bar,
      .patient-meta-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 0.8rem 0.95rem;
        border-radius: 14px;
        border: 0.5px solid #d7e1dc;
        background: rgba(255, 255, 255, 0.9);
      }

      .patient-session-bar-copy,
      .patient-meta-copy {
        min-width: 0;
        display: grid;
        gap: 0.2rem;
      }

      .patient-kicker {
        color: #0F6E56;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .patient-meta-title {
        color: #163329;
        font-size: 0.95rem;
        font-weight: 800;
        line-height: 1.3;
      }

      .patient-meta-copy p,
      .patient-session-bar-copy p {
        margin: 0;
        color: #5f746b;
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .patient-identity-card {
        display: grid;
        gap: 1rem;
      }

      .patient-identity-main {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.9rem;
        align-items: center;
      }

      .patient-avatar {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 110, 86, 0.12);
        color: #0F6E56;
        font-weight: 800;
        font-size: 1rem;
      }

      .patient-identity-copy {
        min-width: 0;
        display: grid;
        gap: 0.15rem;
      }

      .patient-identity-name {
        color: #163329;
        font-size: 1rem;
        font-weight: 800;
        line-height: 1.25;
      }

      .patient-identity-copy p {
        margin: 0;
        color: #5f746b;
        font-size: 0.9rem;
      }

      .patient-chip-row {
        gap: 0.45rem;
      }

      .patient-chip {
        border-radius: 999px;
        font-size: 0.75rem;
      }

      .patient-dashboard-grid {
        display: grid;
        gap: 1rem;
      }

      .patient-track-switch-card {
        display: grid;
        gap: 0.9rem;
        align-items: center;
      }

      .patient-track-nav-card {
        display: grid;
        gap: 0.95rem;
      }

      .patient-track-nav-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .patient-track-nav-card {
        padding: 0.95rem;
        border-radius: 18px;
        border: 0.5px solid #e5e7eb;
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,251,248,0.98));
        text-align: left;
        cursor: pointer;
      }

      .patient-track-nav-card.active {
        border-color: rgba(15, 110, 86, 0.32);
        box-shadow: 0 12px 28px rgba(15, 42, 32, 0.08);
        transform: translateY(-1px);
      }

      .patient-track-nav-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
      }

      .patient-track-nav-icon {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 110, 86, 0.1);
        color: #0f6e56;
      }

      .patient-track-nav-count {
        min-width: 28px;
        padding: 0.22rem 0.52rem;
        border-radius: 999px;
        background: rgba(15, 110, 86, 0.1);
        color: #0f6e56;
        font-size: 0.78rem;
        font-weight: 800;
        text-align: center;
      }

      .patient-track-nav-title {
        margin-top: 0.55rem;
        color: #163329;
        font-size: 0.98rem;
        font-weight: 800;
      }

      .patient-track-nav-latest {
        margin-top: 0.2rem;
        color: #5f746b;
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .patient-track-section-hidden {
        display: none;
      }

      .patient-track-section-full {
        grid-column: 1 / -1;
      }

      .patient-track-switch-copy {
        display: grid;
        gap: 0.35rem;
      }

      .patient-dashboard-card {
        display: grid;
        gap: 0.85rem;
      }

      .patient-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        flex-wrap: wrap;
      }

      .patient-toolbar-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
      }

      .patient-mini-grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .patient-stat {
        padding: 0.95rem;
        border-radius: 14px;
        border: 0.5px solid #e5e7eb;
        background: #ffffff;
      }

      .patient-stat-label {
        margin: 0 0 0.25rem;
        color: #5f746b;
        font-size: 0.8rem;
      }

      .patient-stat-value {
        margin: 0;
        color: #163329;
        font-size: 1rem;
        font-weight: 800;
      }

      .patient-upload-zone {
        display: grid;
        gap: 0.7rem;
        padding: 1rem;
        border-radius: 14px;
        border: 1px dashed rgba(15, 110, 86, 0.28);
        background: rgba(245, 251, 248, 0.75);
      }

      .patient-upload-file {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 0.8rem 0.9rem;
        border-radius: 12px;
        background: #ffffff;
        border: 0.5px solid #d7e1dc;
        font-size: 0.88rem;
        color: #24463a;
      }

      .patient-drug-row {
        padding: 0.8rem;
        border-radius: 14px;
        border: 0.5px solid #e5e7eb;
        background: #fbfefd;
      }

      .patient-note-message,
      .patient-list-text {
        margin: 0;
        line-height: 1.55;
      }

      .patient-list {
        gap: 0.75rem;
      }

      .patient-list-item {
        border: 0.5px solid #e5e7eb;
      }

      .patient-note-header,
      .patient-list-header {
        margin-bottom: 0.55rem;
      }

      .patient-subtle-link {
        color: #0F6E56;
        font-weight: 700;
        text-decoration: none;
      }

      .patient-subtle-link:hover {
        text-decoration: underline;
      }

      @media (min-width: 720px) {
        .patient-dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
        }

        .patient-track-nav-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .patient-session-bar,
        .patient-meta-bar,
        .patient-toolbar,
        .patient-identity-main {
          grid-template-columns: 1fr;
          display: grid;
        }

        .patient-mini-grid {
          grid-template-columns: 1fr;
        }

        .patient-track-nav-grid {
          grid-template-columns: 1fr;
        }

        .patient-avatar {
          width: 48px;
          height: 48px;
        }
      }
    `}</style>
  )
}

function buildBranchLocationLabel(row = {}, branchLocationParam = "") {
  const directLocation = String(row?.location || "").trim()
  if (directLocation) return directLocation

  const pieces = [row?.town, row?.subcounty, row?.county]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  if (pieces.length) return pieces.join(", ")

  return branchLocationParam
}

export default function PatientLayout() {
  const [searchParams] = useSearchParams()
  const pharmacyId = searchParams.get("pharmacy")?.trim() || ""
  const branchNameParam = searchParams.get("branch_name")?.trim() || ""
  const branchLocationParam = searchParams.get("branch_location")?.trim() || ""
  const [pharmacy, setPharmacy] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(pharmacyId))
  const [loadError, setLoadError] = useState("")
  const isAccessBlocked = isSupabaseAccessBlocked({ message: loadError })
  const blockedCopy = isAccessBlocked
    ? buildSupabaseAccessBlockedCopy({
        sourceLabel: "This branch portal",
        objectLabel: "branch details",
        error: { message: loadError },
      })
    : null

  useEffect(() => {
    if (!pharmacyId) {
      return
    }

    let ignore = false

    async function fetchPharmacy() {
      setIsLoading(true)
      setLoadError("")

      const { data, error } = await fetchPatientPortalPharmacyById(pharmacyId)

      if (ignore) {
        return
      }

      if (error) {
        if (isSupabaseAccessBlocked(error)) {
          setPharmacy(null)
          setLoadError(error.message || "We could not load the pharmacy details.")
        } else {
          setPharmacy(null)
          setLoadError(error.message || "We could not load the pharmacy details.")
        }
      } else if (!data) {
        setPharmacy(null)
        setLoadError("This branch is no longer available.")
      } else {
        setPharmacy(data)
      }

      setIsLoading(false)
    }

    fetchPharmacy()

    return () => {
      ignore = true
    }
  }, [pharmacyId])

  function createPatientPath(pathname, extraParams = {}) {
    const params = new URLSearchParams()

    if (pharmacyId) {
      params.set("pharmacy", pharmacyId)
    }

    const exactBranchName = String(branchName || "").trim()
    if (exactBranchName) {
      params.set("branch_name", exactBranchName)
    }

    const exactBranchLocation = String(branchLocation || "").trim()
    if (exactBranchLocation) {
      params.set("branch_location", exactBranchLocation)
    }

    Object.entries(extraParams || {}).forEach(([key, value]) => {
      const normalizedValue = String(value || "").trim()
      if (normalizedValue) {
        params.set(key, normalizedValue)
      }
    })

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  if (!pharmacyId) {
    return <PatientPortal />
  }

  if (isLoading) {
    return (
      <div className="patient-shell">
        <PatientPortalStyles />
        <div className="patient-loading-screen">
          <div className="patient-loading-card">
            <Building2 />
            <h1>Loading your pharmacy portal</h1>
            <p>We are pulling the branch details now.</p>
          </div>
        </div>
      </div>
    )
  }

  const branchName = pharmacy?.name || branchNameParam || "Pharmacy branch"
  const branchLocation = buildBranchLocationLabel(pharmacy, branchLocationParam)

  return (
    <PatientContext.Provider
      value={{
        pharmacyId,
        pharmacy,
        branchName,
        branchLocation,
        createPatientPath,
      }}
    >
      <div className="patient-shell">
        <PatientPortalStyles />

        <header className="patient-topbar">
          <div className="patient-topbar-copy">
            <span className="patient-topbar-label">
              <Building2 />
              Branch portal
            </span>
            <div className="patient-topbar-name">{branchName}</div>
            {branchLocation ? <div className="patient-topbar-meta">{branchLocation}</div> : null}
          </div>

          <div className="patient-powered">Powered by PharmaCourse</div>
        </header>

        <main className="patient-main">
          {loadError && !pharmacy ? (
            <section className="patient-card patient-card-muted">
              <div className="patient-toolbar">
                <div className="patient-meta-copy">
                  <span className="patient-kicker">{isAccessBlocked ? "Supabase access blocked" : "Branch not found"}</span>
                  <div className="patient-meta-title">
                    {isAccessBlocked ? "The POS project is blocking the branch lookup." : "This patient portal link is no longer active."}
                  </div>
                  <p>{isAccessBlocked && blockedCopy ? blockedCopy.summary : loadError}</p>
                  {isAccessBlocked && blockedCopy?.hint ? <p>{blockedCopy.hint}</p> : null}
                </div>
                <Link to="/patient" className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  Find another pharmacy
                </Link>
              </div>
            </section>
          ) : null}

          {loadError && pharmacy ? (
            <div className="patient-message patient-message-error">
              We loaded the portal, but the branch details could not be refreshed{isAccessBlocked ? " because Supabase access is blocked" : ""}: {loadError}
            </div>
          ) : null}

          {(!loadError || pharmacy) ? (
            <div className="patient-branch-lock">
              <div className="patient-branch-lock-title">Branch locked for this session</div>
              <div className="patient-branch-lock-copy">
                You are connected to <strong>{branchName}</strong>. Registration, prescriptions, appointments, maternal requests, and tracking on these pages all go directly to this branch in RemedacarePOS.
              </div>
            </div>
          ) : null}

          <PatientInstallPrompt />

          <Outlet />
        </main>

        <nav className="patient-bottom-nav" aria-label="Patient portal navigation">
          {tabs.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={createPatientPath(to)}
              className={({ isActive }) => `patient-tab${isActive ? " active" : ""}`}
              end={to === "/patient"}
            >
              {createElement(icon)}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </PatientContext.Provider>
  )
}
