# Troubleshooting Guide

## Problem: Webpage Stuck / No Response

### Quick Diagnostic Steps:

1. **Check if backend is running:**
   ```bash
   node check-setup.mjs
   ```

2. **Open browser console (F12)** and look for logs starting with:
   - `[TASK]` - Frontend task submission
   - `[POLL]` - Frontend polling status
   
3. **Check terminal** where you ran `npm run dev` for logs:
   - `[SERVER]` - Backend processing

### Common Issues:

#### Issue 1: main.py Not Found
**Symptom:** Error message about main.py not found

**Solution:**
```bash
# Set the correct path to your main.py
set AKYA_MAIN_PY=C:\path\to\your\main.py
npm run dev
```

#### Issue 2: Backend Not Running
**Symptom:** "Cannot reach the local backend" error

**Solution:**
```bash
cd swayat-ui
npm run dev
```

#### Issue 3: Task Stuck in "Running" State
**Symptom:** Page shows "Running for Xs" but never completes

**Check:**
1. Look at terminal for `[SERVER] stdout:` or `[SERVER] stderr:` messages
2. Your main.py might be waiting for input or stuck in a loop
3. Check if Python process is actually running (Task Manager)

#### Issue 4: No Console Logs
**Symptom:** Browser console is empty

**Solution:**
1. Open DevTools (F12)
2. Go to Console tab
3. Refresh the page
4. Try submitting a task again

### Debug Checklist:

- [ ] Backend server is running (check terminal)
- [ ] main.py exists at the configured path
- [ ] Browser console shows `[TASK]` logs when submitting
- [ ] Terminal shows `[SERVER]` logs when task is received
- [ ] Python process starts (check `[SERVER] Python process spawned`)
- [ ] Python output appears in terminal (`[SERVER] stdout:`)

### Manual Test:

Test the backend directly:
```bash
curl -X POST http://localhost:8787/api/run-task ^
  -H "Content-Type: application/json" ^
  -d "{\"task\":\"test task\"}"
```

You should see a JSON response with a `jobId`.
