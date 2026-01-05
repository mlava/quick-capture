# Quick Capture for Roam Research

**Quick Capture for Roam Research** lets you use **Todoist as a universal inbox** and then import captured items directly into your Roam graph.

Email, voice assistants, mobile apps, browser extensions — they all speak Todoist.  
This extension turns Todoist into a **reliable capture gateway** for Roam.

Works with **Todoist Free and Premium** accounts.

---

## What this extension does

- Imports tasks from your Todoist inbox (or filtered subset)
- Creates clean, structured Roam blocks
- Supports **manual import** and **automatic background sync**
- Prevents duplicate imports using invisible block metadata
- Optionally performs actions in Todoist *after* import

Setup is straightforward, but the extension offers **fine-grained configuration** so you can tailor imports to your workflow.

---

## ⚠️ Important: Todoist API change (Label Mode)

A recent change in the Todoist API affects how labels are handled.

If you enable **Label Mode**:

> **You must enter the LABEL NAME (not the label ID)**  
> in the setting **“Todoist Label Name (optional)”**

Older versions required a label ID. This is no longer supported by the API.

---

## ✨ What’s new (major update)

- Robust handling of Todoist API changes
  - Automatic fallback from legacy API (v1) to REST API (v2)
- Safer background imports (no duplicate tasks)
- More reliable comment and attachment imports
- Improved automatic Daily Notes Page (DNP) placement
- Cleaner command-palette integration (no manual unload cleanup required)

---

## Key features

### Automatic import
- Enable **Automatic Import** in Roam Depot settings
- New Todoist items are periodically synced into today’s Daily Notes Page
- Frequency is configurable (in minutes)

### Post-import actions in Todoist
Choose what happens to tasks after they’re imported:
- **Nothing** – leave the task untouched
- **Delete** – remove it from Todoist
- **Label** – apply a label (configurable)

### Import Todoist labels as Roam tags
- Convert Todoist labels into Roam `#[[tags]]`
- Optionally replace underscores (`_`) with spaces

### Optional metadata imports
Enable or disable:
- Task description
- Created date
- Due date
- Priority
- Comments and attachments (Premium accounts get richer attachment handling)

### Idempotent imports (no duplicates)
- Imported tasks are tagged invisibly with their Todoist ID
- Re-running the importer updates existing blocks instead of duplicating them

---

## Using the extension

### Manual import
1. Focus a block in Roam
2. Open the Command Palette (`Ctrl-P` / `Cmd-P`)
3. Select **“Import Quick Capture items from Todoist”**

Tasks will be inserted under the focused block.

### Automatic import
- Enable **Automatic Import** in settings
- Items will be added under a configured header on today’s DNP

---

## Setup instructions

### Retrieve your Todoist API token
Watch this short walkthrough:  
https://www.loom.com/share/d8e4d6d3c31c43aca3e2ba49914787c3

### Retrieve your Todoist inbox ID
Watch this walkthrough:  
https://www.loom.com/share/35816b92f0644c088f19c9bb471bd529

---

## Configuration reference

A full walkthrough of all configuration options is available here:  
https://roamresearch.com/#/app/RoamScripts/page/ZMIPifeIp

---

## Tips

- Combine this extension with an **Unread / Inbox badge** extension for a lightweight “processing prompt”
- Use Todoist as your capture layer, and Roam as your thinking layer
- Label Mode is ideal if you want multiple capture streams (e.g. `inbox`, `reading`, `ideas`)
