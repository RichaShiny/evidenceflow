# EvidenceFlow

**Continuous evidence and risk intelligence for modern assurance teams.**

[Open the live demo](https://richashiny.github.io/evidenceflow/)

EvidenceFlow brings finance, audit, compliance, cyber, and ESG evidence into one focused workspace. It helps teams identify what is missing, investigate explainable risk signals, and keep remediation work moving.

## What it demonstrates

- Evidence intake with review status and suggested control mapping
- Control health and required-evidence tracking
- Explainable findings for access, finance, vendor, and ESG risks
- Accountable remediation actions with owners and due dates
- A concise executive assurance summary

## Product flow

Evidence → control → finding → assigned action → executive report

The demo uses realistic synthetic data for a fictional organization, Northstar Foods.

## Run locally

This is a static site. Open dist/index.html in a browser, or serve the repository with any static-file server.

## Deployment

GitHub Pages hosts the production site. The deployment workflow lives in .github/workflows/deploy-pages.yml.

On each push to main, GitHub Actions validates the static application, packages the dist directory, and deploys it to GitHub Pages.

## Owner

Richa Tigiripally
