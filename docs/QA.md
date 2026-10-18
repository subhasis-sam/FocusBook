# FocusBook QA checklist

Run this against a development or preview Android build after loading `assets/starter-tasks.json`.

## First run and persistence

- Clear app storage and launch. Confirm all ten categories and exactly 85 tasks appear, all unchecked.
- Complete one starter task. Force-stop the app, relaunch, and confirm it remains complete.
- Uncheck it, force-stop again, and confirm it remains unchecked.
- Relaunch repeatedly and confirm task/category counts do not grow and completion never resets.

## Task workflows

- Add a task with only its required title and category.
- Add a task with notes, high priority, due date, scheduled date, and a top-three flag.
- Edit the title, category, priority, and dates; verify the new values in Today and Categories.
- Delete a user-created task and confirm it disappears from searches and progress totals.
- Search from Categories and filter one category to All, Pending, and Completed.
- Check/uncheck tasks from Today, search results, and category detail.
- Mark a task complete and confirm the strikethrough and category progress update immediately.
- Mark a fourth active task as a top-three priority and confirm the app rejects it with a clear message.

## Dates and reminders

- Schedule a task for today and for a later day; verify Today and the seven-day Plan view.
- Add a past-due task and confirm it appears under Overdue.
- Schedule a reminder a few minutes ahead, background the app, and confirm Android delivers it.
- Deny notification permission and confirm the app reports that reminders could not be enabled.
- Cancel a reminder in More and verify it no longer appears in the Android notification schedule.

## Offline and backup

- Enable airplane mode and exercise completion, add, edit, search, and category progress.
- Export a JSON backup and inspect that categories, all tasks, completion state, priority, and dates are present.
- Import that backup into a clean install and compare counts and completed state.
- Try an invalid JSON file and cancel a restore; confirm the current notebook is unchanged.
