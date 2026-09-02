# Durood Time Web UI/UX Plan

## Purpose

Create a first-class web experience for Durood Time without rewriting the app's business logic or weakening the mobile experience. The web version should feel comfortable on desktop, tablet, and mobile browsers rather than behaving like a stretched phone screen.

## Product Direction

The web experience should be calm, focused, and content-led:

- Make the daily counting action immediately understandable.
- Give progress and planning enough space to be useful on a large screen.
- Make Dalail reading and video browsing comfortable with mouse, keyboard, and touch.
- Keep the existing dark visual language, green primary accent, spiritual tone, and familiar route names.
- Prefer a small number of strong layouts over many one-off responsive exceptions.

## Guardrails

- Share data hooks, stores, services, route names, and domain calculations between platforms.
- Use web-specific layout components only where a mobile pattern does not translate well.
- Do not duplicate business rules inside web components.
- Do not make desktop screens depend on hover; every action must work with keyboard and touch.
- Keep the existing mobile bottom navigation and phone-sized interaction patterns unchanged unless a change improves both platforms.
- Introduce responsive behavior through a small, documented breakpoint system.
- Preserve loading, empty, error, offline, authentication, and sync states in every redesigned screen.

## Target Layout System

Use three layout modes rather than styling every width independently:

| Mode | Viewport | Layout behavior |
| --- | --- | --- |
| Compact | below 768px | Existing mobile composition; bottom navigation; one-column content |
| Expanded | 768px to 1199px | Compact sidebar or top navigation; two-column cards where useful |
| Wide | 1200px and above | Fixed navigation rail; centered content with a maximum width; multi-column dashboard layouts |

Recommended layout tokens:

- Page content max width: `1200px`.
- Reading content max width: `760px`.
- Wide page horizontal padding: `32px` to `48px`.
- Expanded page horizontal padding: `24px`.
- Compact page horizontal padding: existing `16px` unless a screen requires otherwise.
- Minimum interactive target: `44px`.
- Card radius, colors, and spacing should come from shared theme tokens rather than screen-local values.

## Global Web Shell

### Desktop navigation

Replace the desktop presentation of `AnimatedTabBar` with a persistent navigation rail or sidebar. It should contain:

- Durood Time identity at the top.
- Home, Dalail, Progress, Planner, Fazilat, Shorts, and Profile destinations.
- A clear active state using both color and shape, not color alone.
- A compact collapse option only if it remains discoverable and accessible.

The existing animated bottom bar should remain the compact layout. Avoid showing both desktop and bottom navigation at the same time.

### Header

Adapt `SimpleHeader` for web instead of forcing a phone header across all widths:

- Desktop: page title, short contextual description, and profile/account action.
- Expanded: compact top header paired with the navigation rail.
- Compact: preserve the current logo, title, and profile action.
- Keep the header visually quiet so the counter and reading content remain primary.

### Shared states

Create consistent web-ready treatments for:

- Loading: centered skeleton or progress indicator within the page layout, not a layout jump.
- Empty: explanatory message plus one clear next action.
- Error: concise explanation, retry action, and offline indication where relevant.
- Signed out: explain what works locally and what signing in enables.
- Success: use inline confirmation or toast where possible; avoid relying only on native alert dialogs on web.

## Screen Plans

### Home / Tasbeeh Counter

Goal: make counting the obvious primary action while exposing useful context without clutter.

Wide layout:

- Main two-column composition.
- Left: large counter ring or counting surface, current count, session controls, and primary increment action.
- Right: today's progress, streak, lifetime total, session goal, and a short route to Progress or Planner.
- Keep the main counting control visually dominant and centered within a comfortable interaction zone.
- Add explicit keyboard support, such as `Space` or `Enter` for counting, with a visible help hint.
- Make manual addition and session-goal editing desktop dialogs or anchored panels rather than phone-style bottom sheets.

Expanded layout:

- Keep the counter and summary in one column when width is limited.
- Move secondary statistics below the counter rather than creating cramped cards.

Compact layout:

- Preserve the current mobile flow and bottom navigation.

Quality checks:

- The count action must not be hidden below the fold on common laptop heights.
- Focus must remain visible after each action.
- Keyboard counting must not trigger accidental page scrolling or form submission.

### Progress

Goal: turn the existing vertical summary into a readable personal dashboard.

Wide layout:

- Hero summary across the content width with completion percentage and goal context.
- Three stat cards for streak, monthly average, and best day.
- Two-column lower area: Today card and monthly chart.
- Keep estimated completion as a distinct callout with plain-language explanation.
- Add chart labels and accessible text summary so the chart is not the only way to understand the data.

Expanded layout:

- Use a two-column grid where cards remain at least `280px` wide.
- Stack the chart below the summary if the chart becomes difficult to read.

Compact layout:

- Preserve the existing single-column order, but ensure chart overflow is handled cleanly.

### Planner

Goal: make goal setup feel like a guided planning task rather than a long form.

Wide layout:

- Left column: goal, target date or pace mode, and daily target inputs.
- Right column: live plan preview showing remaining amount, daily requirement, finish estimate, and impact versus current average.
- Use a clear step order: choose goal, choose strategy, review impact, save plan.
- Presets should look like selectable options with selected, hover, focus, and disabled states.
- Replace web `Alert` flows with inline validation and an in-page success message.

Expanded layout:

- Keep the preview below the form when two columns would be too narrow.

Compact layout:

- Preserve the form order and use full-width controls with sufficient spacing.

### Dalail

Goal: help users begin today's portion quickly and return to their reading position.

Wide layout:

- Strong hero with title, today's action, and continue-reading action.
- A prominent Today card with completion state and page range.
- Weekly cycle displayed as a readable grid or horizontal list with visible day labels, not just a narrow strip of cards.
- Bookmarks shown as a compact list or grid with page numbers and last-read context.
- Keep the primary action labeled with a verb such as `Read today` or `Continue reading`.

### Dalail Reader

Goal: provide a focused, distraction-free reading surface.

- Center the page image in a reading column with a dark neutral surround.
- Provide persistent, keyboard-accessible previous, next, bookmark, and zoom controls.
- On wide screens, keep controls near the reading column rather than at extreme viewport edges.
- Show page position and a way to jump to a page.
- Do not allow the image to become wider than comfortable reading bounds.
- Ensure zoom and pan work with mouse wheel, keyboard, and touch where supported.
- Preserve progress and bookmark feedback without interrupting reading.

### Videos

Goal: make browsing feel like a media library rather than a phone feed.

- Use a responsive card grid: one column compact, two columns expanded, three or four columns wide depending on card width.
- Keep thumbnails at a consistent aspect ratio.
- Show title, channel/source, duration, and watch progress with predictable hierarchy.
- Add a page-level heading and, if supported by existing data, filtering or sorting controls.
- Use a clear empty state and retry state for failed Appwrite requests.

### Shorts

Goal: preserve the immersive vertical video behavior while making desktop viewing intentional.

- Keep the vertical feed on compact screens.
- On wide screens, place the active short in a centered, phone-like player column with metadata and controls alongside it.
- Keep the page background quiet and prevent the video from stretching awkwardly across a large monitor.
- Provide keyboard controls for play/pause, next, previous, and mute where the player supports them.
- Make scroll snapping, active-video behavior, and focus management predictable for mouse and keyboard users.

### Fazilat

Goal: make educational and inspirational content scannable.

- Use a responsive card grid on web.
- Give each card a consistent title, summary, media treatment, and action hierarchy.
- Avoid long uninterrupted text blocks; use readable measure and progressive disclosure where content is lengthy.
- Ensure video cards and text cards share alignment and spacing rules.

### Profile and Auth

Goal: make account state and sign-in benefits clear.

- Use a centered, narrow auth form on web with clear labels and error messages.
- Explain local/offline behavior separately from cloud-sync benefits.
- Provide visible focus states and usable password or provider-auth error recovery.
- On authenticated Profile, group account, sync, and sign-out actions into distinct sections.

## Responsive Component Architecture

Add a small set of layout primitives rather than scattering `Platform.OS` checks throughout screens:

- `WebAppShell` or equivalent responsive shell for navigation and page frame.
- `ResponsivePage` for max width, horizontal padding, and bottom spacing.
- `ResponsiveGrid` for dashboard and media card layouts.
- `DesktopHeader` or an enhanced `SimpleHeader` variant.
- `WebDialog` / `InlineFeedback` for web-friendly form feedback.
- Shared `Card`, `Button`, `Pill`, `Skeleton`, and `EmptyState` variants where current styles are duplicated.

Keep screen components responsible for composition and user intent. Keep breakpoints and layout rules in shared components or theme constants.

## Accessibility Requirements

- Every interactive element has an accessible name and role.
- Keyboard focus is visible and follows a logical order.
- Dialogs trap focus, close predictably, and return focus to the trigger.
- Text and icon contrast meet WCAG AA where practical, including muted text.
- Status is communicated with text or icons plus color.
- Charts, progress rings, and video states have text alternatives.
- Respect reduced-motion preferences on web.
- Use semantic headings in a meaningful hierarchy.
- Do not make hover the only way to reveal an action.

## Implementation Sequence

### Phase 1: Foundation

- Audit the current web render of every route at compact, expanded, and wide widths.
- Establish breakpoint, spacing, content-width, typography, and elevation tokens.
- Implement the responsive shell and desktop navigation.
- Add a shared page container and grid primitives.
- Confirm that mobile navigation and route behavior remain unchanged.

### Phase 2: Core User Journey

- Redesign Home for desktop counting.
- Redesign Progress and Planner as dashboard/form compositions.
- Add keyboard interaction and web-friendly feedback for counting and planning.

### Phase 3: Content Experiences

- Redesign Dalail landing page.
- Refine Dalail Reader controls, reading width, and focus behavior.
- Convert Videos and Fazilat to responsive content grids.
- Give Shorts a centered desktop player treatment.

### Phase 4: Quality Pass

- Add accessibility checks and keyboard walkthroughs.
- Test signed-in, signed-out, offline, loading, empty, and error states.
- Test at common viewport sizes and browser zoom levels.
- Compare mobile screenshots before and after web changes to detect regressions.
- Remove duplicated responsive styles and document exceptions.

## Acceptance Criteria

- At `1200px` or wider, the app has persistent navigation and a centered content area rather than a stretched phone layout.
- At `768px`, important cards and forms remain readable without horizontal scrolling.
- At compact widths, the current mobile navigation and primary flows remain usable.
- Home counting, Planner editing, Dalail reading, video browsing, and Profile/Auth flows work with keyboard and touch.
- No primary action depends on hover, color alone, or a native mobile alert on web.
- Loading, empty, error, offline, and signed-out states have intentional layouts.
- The web UI uses shared tokens and primitives instead of accumulating screen-specific magic numbers.
- A manual responsive QA checklist passes before visual polish work is considered complete.

## Out Of Scope For This Plan

- Replacing Expo Router or migrating the main app to Next.js.
- Rewriting Appwrite services, Zustand state, or domain calculations.
- Adding new product features unrelated to web usability.
- Changing the mobile visual identity without evidence from usability testing.
