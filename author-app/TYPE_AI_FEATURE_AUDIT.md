# 36Seas Author Studio — Competitive Feature Audit

Audit date: August 6, 2026

This document uses Type.ai and Scribistiq's public product pages and documentation as capability
benchmarks. It does not propose copying either product's visual identity, language, or proprietary
implementation. The 36Seas product differentiator is the complete crossing from manuscript to a
professionally packaged book, with meaningful human expertise available at the finish line.

## Product position

**Type.ai:** AI-first long-form writing and editing workspace.

**Scribistiq:** rapid whole-book generation with cover, audio, and KDP-ready outputs.

**36Seas Author Studio:** AI-assisted book creation, editorial development, production, and an
optional paid expert publishing desk.

## Capability map

| Capability | Type.ai public feature | Current 36Seas state | Build decision |
|---|---|---|---|
| Long-form editor | Block-based editor for book-length work | Chapter drafts are displayed, not edited in a full editor | Build a real manuscript editor first |
| AI writing at cursor | Generate, continue, sentence, paragraph, list, headline | Chapter generation only | Add command palette and contextual generation |
| Inline rewrite | Improve, shorten, lengthen, grammar, simplify, readability | Review returns notes and line edits separately | Add selection toolbar with preview, accept, reject |
| Document review | Whole-document reviews with accept/dismiss | AI editorial review exists | Bring suggestions into the editor |
| AI chat | Document-aware sidebar | No persistent in-editor chat | Add manuscript-aware assistant panel |
| Story memory | Characters, settings, scenes, notes | Character profiles and premise exist per story | Expand to editable story bible and project memory |
| Content ideas | Context-aware next-step suggestions | Outline and chapter summaries exist | Add ideas panel based on manuscript state |
| Draft generation | Generate from idea and references | Story builder creates outline and chapters | Keep and connect directly to editor |
| Imports | Word, PDF, URLs, images/text | Word, text, Markdown | Add PDF, URL, and OCR/image import later |
| Exports | Word, PDF, HTML, Markdown, share link, audio | EPUB, print PDF, submission zip | Add DOCX, Markdown, share link; audio is later |
| Rich documents | Headers, text, quotes, images, tables, code, math | Plain manuscript text | Book-first rich text: headings, scenes, images, breaks, notes |
| Organization | Folders, tabs, project organization | Manuscripts and story projects | Unify both under Book Projects; add folders later |
| Version history | Available | Not surfaced | Add autosave snapshots and restore |
| Offline mode | Available | Not available | Later PWA milestone after editor stability |
| Custom style | Writing rules and style references | Genre/premise prompting | Add author voice profile and project instructions |
| Model choice | Multiple frontier models | Anthropic integration | Add provider/model routing after core editor |
| Collaboration | Sharing and organizational workflow | Publisher team workspaces exist | Add comments and editor roles later |
| Cover design | Not a core Type.ai feature | Front and full-wrap generation exists | Make this a core 36Seas differentiator |
| Interior formatting | Basic exports | EPUB and trim-sized print PDF exists | Keep and add visual preview/preflight |
| ISBN/KDP metadata | Not a core Type.ai feature | ISBN pool and submission sheet exist | Keep as publishing-production workflow |
| Expert services | Not core writing workflow | Admin review exists but no one-off service checkout | Build paid 36Seas Publishing Desk |
| Submission packaging | Not core writing workflow | KDP package generator exists | Offer self-service and expert-managed tiers |

## Scribistiq benchmark

| Capability | Scribistiq public feature | Current 36Seas state | Build decision |
|---|---|---|---|
| Whole-book generation | Up to 30 chapters and 100,000+ words | Sequential chapter generation | Add queued whole-book drafting with visible progress, pause, retry, and cost limits |
| Streaming progress | Chapters appear as they are generated | Request/response chapter generation | Stream generation status and make completed chapters immediately editable |
| Continuity bible | Tracks characters, locations, and plot threads | Character profiles and outline | Build an editable story bible with automatic entity extraction and contradiction alerts |
| Voice matching | Learns rhythm and language from a sample | Genre-led prompting | Add an author voice profile with explicit consent and originality safeguards |
| Cover variants | Four generated concepts | Single generated result/workflow | Generate a selectable concept board, then refine typography and wrap editions |
| Audiobooks | Chapter and whole-book narration | Not implemented | Add after text editing and publishing preflight are stable |
| Chapter regeneration | Regenerate one chapter independently | Already supported | Preserve, but add version comparison and restore |
| AI selection tools | Rewrite, shorten, expand, continue | Not in a true editor | Include in the manuscript editor milestone |
| Multi-format export | PDF, EPUB, DOCX, KDP wrap | EPUB, print PDF, KDP wraps | Add DOCX and a single edition/export center |
| Free chapter preview | Generation preview before purchase | Free plan credits | Consider a bounded first-chapter preview as acquisition funnel |
| Ownership statement | User owns outputs | Not prominent enough | Add explicit manuscript ownership and AI-use disclosures throughout onboarding |

## Where 36Seas should be better

1. **Editing before velocity.** A complete draft is the beginning of the process, not a promise that
   raw generated text is publication-ready.
2. **Transparent provenance.** Track which passages and images were AI-assisted so authors can make
   accurate retailer disclosures.
3. **Human-quality gates.** Run continuity, originality, readability, accessibility, metadata, and
   production checks before calling a book ready.
4. **Real publishing expertise.** Let authors purchase an expert review and packaging service inside
   the same project instead of leaving with a zip file and uncertainty.
5. **Author control.** Every generation should be previewable, reversible, and versioned; no chapter
   should be silently overwritten.
6. **Professional cover production.** Concept generation should lead into typography, edition sizing,
   spine calculation, bleed checks, and optional human art direction.
7. **Responsible scale.** Whole-book generation should be resumable and cost-controlled, with quality
   checks between chapters rather than optimizing only for speed.

## 36Seas product architecture

### 1. Write

- Unified Book Project
- Book-length rich editor with autosave
- Outline and chapter navigator
- Story bible / nonfiction source notes
- AI chat grounded in the active book
- Cursor commands and inline rewrite suggestions
- Reviews with accept/reject
- Version history

### 2. Design

- AI cover brief and concept generation
- Front-cover variations
- Typography and genre-fit checks
- Paperback and hardcover wrap generation
- Human designer handoff option

### 3. Produce

- EPUB and print PDF
- Trim, bleed, margin, page-count, and spine calculations
- Copyright and front-matter builder
- Accessibility and file preflight
- Metadata, keywords, categories, pricing, and ISBN assignment

### 4. Publish

- Self-service KDP package download
- Paid expert packaging request
- Secure project submission to 36Seas
- Scope, price, payment, and service status
- Expert feedback and author approval
- Final deliverables and guided KDP handoff

## Paid expert service workflow

1. Author completes a readiness checklist.
2. Studio validates required manuscript, cover, metadata, and formatting inputs.
3. Author selects a fixed-scope service package and pays through Stripe.
4. A frozen project snapshot is submitted to the 36Seas review queue.
5. Staff accepts, requests missing material, or adjusts scope before work begins.
6. Author sees status, messages, deliverables, and approval requests in the app.
7. 36Seas returns final files and completes a guided KDP submission handoff.

The interface must never imply that Amazon KDP can be submitted through an undocumented public
API. Expert submission means 36Seas prepares and guides the manual submission process.

## Recommended delivery order

### Phase 1 — Real author workspace

- Unified start-book flow
- Project dashboard and progress model
- Manuscript editor with autosave
- Chapter navigator and editable outline
- Import and existing AI review connection

### Phase 2 — Embedded AI

- AI chat sidebar
- Inline rewrite tools
- Review suggestions with accept/reject
- Story bible and writing rules
- Usage controls and safety limits
- Streaming whole-book generation with pause, resume, and chapter-level retry
- Automatic continuity checks against the story bible

### Phase 3 — Publishing production

- Cover-design workspace
- Formatting preview and preflight
- Metadata and edition manager
- Self-service publication package
- Four-option cover concept board and visual edition manager
- DOCX export and unified download center

### Phase 4 — 36Seas Publishing Desk

- Service catalog and fixed prices
- Stripe one-time checkout
- Expert-submission intake and project snapshot
- Staff work queue, messages, approvals, and delivery

### Phase 5 — Professional platform features

- Version history and restore
- Sharing, comments, and collaborator roles
- DOCX/Markdown/share exports
- Offline/PWA support
- Optional narrated audio
- Author voice profiles with consent, deletion, and originality controls

## Public sources reviewed

- https://type.ai/
- https://blog.type.ai/post/type-ai-overview
- https://type.ai/ai-book-writer
- https://type.ai/ai-writing-tools
- https://blog.type.ai/faqs
- https://www.scribistiq.com/
