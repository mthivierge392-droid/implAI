# 🎨 Quick Branding - Change Your Logo

## ✅ **WHAT YOUR CLIENTS NEED TO CHANGE**

To customize the favicon/logo, replace these **4 FILES**:

```
app/icon.png              ← Replace with your logo (512x512px)
app/apple-icon.png        ← Replace with your logo (512x512px)
public/icon.png           ← Replace with your logo (512x512px)
public/apple-touch-icon.png ← Replace with your logo (180x180px)
```

---

## 🚀 **STEP-BY-STEP INSTRUCTIONS**

### **Step 1: Prepare Your Logo**
- Create a square PNG file (512x512 pixels)
- Transparent background recommended
- Save as `your-logo.png`

### **Step 2: Replace All 4 Files**

**Option A: Using Command Line**

```bash
# Copy your logo to all 4 locations
cp your-logo.png app/icon.png
cp your-logo.png app/apple-icon.png
cp your-logo.png public/icon.png
cp your-logo.png public/apple-touch-icon.png
```

**Option B: Using Windows (PowerShell)**

```powershell
copy your-logo.png app\icon.png
copy your-logo.png app\apple-icon.png
copy your-logo.png public\icon.png
copy your-logo.png public\apple-touch-icon.png
```

**Option C: Manual Drag & Drop**
1. Open the `app/` folder
2. Drag your logo onto `icon.png` (overwrite)
3. Drag your logo onto `apple-icon.png` (overwrite)
4. Open the `public/` folder
5. Drag your logo onto `icon.png` (overwrite)
6. Drag your logo onto `apple-touch-icon.png` (overwrite)

### **Step 3: Deploy**

```bash
git add app/ public/
git commit -m "Update branding"
git push
```

Vercel will auto-deploy in 1-2 minutes.

---

## 📱 **TESTING ON MOBILE**

After deployment, **clear your mobile browser cache**:

### **iPhone (Safari):**
1. Settings → Safari
2. "Clear History and Website Data"
3. Close Safari completely (swipe up from bottom)
4. Reopen your site

### **Android (Chrome):**
1. Chrome → Three dots → Settings
2. Privacy → Clear browsing data
3. Select "Cached images and files"
4. Clear data
5. Reopen your site

---

## ⚠️ **IMPORTANT NOTES**

- **All 4 files must be the same logo** for consistency
- Desktop browsers use `app/` folder
- Mobile browsers use `public/` folder
- Having both ensures 100% compatibility
- Favicon changes can take 5-10 minutes to appear due to CDN caching

---

## 🎯 **SUMMARY**

**Replace these 4 files:**
1. `app/icon.png`
2. `app/apple-icon.png`
3. `public/icon.png`
4. `public/apple-touch-icon.png`

**Then:**
```bash
git add .
git commit -m "Update logo"
git push
```

**Wait 2-3 minutes, then clear mobile cache.**

Done! ✅
