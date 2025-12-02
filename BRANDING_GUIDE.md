# 🎨 Branding & Customization Guide

This guide shows buyers how to easily customize the platform with their own branding.

---

## 🖼️ **1. CHANGE LOGO & FAVICON**

### **Quick Method (2 Minutes)**

Replace just **2 FILES** for universal compatibility:

```
public/
├── favicon.ico           ← Your favicon (all browsers)
└── apple-touch-icon.png  ← iOS devices
```

### **Step-by-Step Instructions:**

1. **Go to [Favicon.io](https://favicon.io/favicon-converter/)**

2. **Upload your logo** (PNG, 512x512px recommended)

3. **Click "Download"** - you'll get a ZIP file

4. **Extract the ZIP** - you'll see multiple files

5. **Copy ONLY these 2 files to `public/` folder:**
   ```bash
   # On Mac/Linux:
   cp ~/Downloads/favicon_io/favicon.ico public/favicon.ico
   cp ~/Downloads/favicon_io/apple-touch-icon.png public/apple-touch-icon.png
   ```

   **Or on Windows:**
   ```batch
   copy C:\Users\YourName\Downloads\favicon_io\favicon.ico public\favicon.ico
   copy C:\Users\YourName\Downloads\favicon_io\apple-touch-icon.png public\apple-touch-icon.png
   ```

6. **Deploy:**
   ```bash
   git add public/
   git commit -m "Update favicon"
   git push
   ```

7. **Clear cache:**
   - Desktop: Ctrl+F5 (hard refresh)
   - Mobile: Settings → Clear browser cache

**That's it! Works on all browsers and devices.** ✅

---

## 🎨 **2. CHANGE COLORS & THEME**

### **Primary Colors**

Edit `app/globals.css` to change the color scheme:

```css
/* File: app/globals.css */

:root {
  /* CHANGE THESE FOR YOUR BRAND */
  --primary: 221.2 83.2% 53.3%;        /* Main brand color (blue) */
  --primary-foreground: 210 40% 98%;   /* Text on primary */

  /* Optional: Adjust these too */
  --accent: 210 40% 96.1%;             /* Hover states */
  --destructive: 0 84.2% 60.2%;        /* Error color (red) */
  --ring: 221.2 83.2% 53.3%;           /* Focus ring */
}

.dark {
  /* Dark mode colors */
  --primary: 217.2 91.2% 59.8%;        /* Lighter blue for dark mode */
}
```

**How to pick colors:**
1. Choose your brand color (hex: #3B82F6)
2. Convert to HSL using [HSL Color Picker](https://hslpicker.com/)
3. Replace the values above

**Example - Change to Purple:**
```css
:root {
  --primary: 270 91% 65%;  /* Purple */
}
```

**Example - Change to Green:**
```css
:root {
  --primary: 142 76% 36%;  /* Green */
}
```

---

## 📝 **3. CHANGE APP NAME & TITLE**

### **Browser Tab Title**

Edit `app/layout.tsx`:

```typescript
// File: app/layout.tsx (line 19-25)

export const metadata: Metadata = {
  title: "Your Company Name",              // ← Change this
  description: "Your custom description",   // ← Change this
  icons: {
    icon: '/icon.png',
  },
};
```

### **Dashboard Header**

Edit `app/dashboard/layout.tsx`:

```typescript
// File: app/dashboard/layout.tsx (line 88-90)

<div className="flex items-center gap-3">
  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
    <span className="text-primary-foreground font-bold text-sm">AI</span>  {/* ← Change "AI" */}
  </div>
  <h1 className="text-lg font-semibold text-foreground">Monitoring</h1>  {/* ← Change "Monitoring" */}
</div>
```

**Or replace with an image logo:**
```typescript
<div className="flex items-center gap-3">
  <img src="/logo.png" alt="Logo" className="h-8" />
  <h1 className="text-lg font-semibold">Your Company</h1>
</div>
```

---

## 🏷️ **4. CHANGE SUPPORT EMAIL**

Your support email appears in the login page. Update it in `.env.local`:

```bash
# File: .env.local

NEXT_PUBLIC_SUPPORT_EMAIL=support@yourcompany.com
```

This will automatically update:
- Login page "Contact us" button
- Any support references in the app

---

## 🎭 **5. CUSTOMIZE LOGIN PAGE**

Edit `app/page.tsx` to customize the login experience:

```typescript
// File: app/page.tsx (line 20-24)

<h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
<p className="text-sm text-muted-foreground">
  Professional AI phone agent monitoring  {/* ← Change this tagline */}
</p>
```

**Change the icon on login page:**
```typescript
// File: app/page.tsx (line 16-18)

<div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
  <Phone className="w-8 h-8 text-primary" />  {/* ← Replace with your icon */}
</div>
```

---

## 🎨 **6. PRE-CONFIGURED THEMES**

### **Professional Blue** (Default)
Already configured! No changes needed.

### **Vibrant Purple**
```css
/* app/globals.css */
:root {
  --primary: 270 91% 65%;
  --ring: 270 91% 65%;
}
.dark {
  --primary: 270 80% 70%;
}
```

### **Fresh Green**
```css
:root {
  --primary: 142 76% 36%;
  --ring: 142 76% 36%;
}
.dark {
  --primary: 142 70% 45%;
}
```

### **Bold Orange**
```css
:root {
  --primary: 24 95% 53%;
  --ring: 24 95% 53%;
}
.dark {
  --primary: 24 90% 60%;
}
```

### **Corporate Navy**
```css
:root {
  --primary: 214 100% 25%;
  --ring: 214 100% 25%;
}
.dark {
  --primary: 214 95% 35%;
}
```

---

## 📱 **7. ADD CUSTOM LOGO TO DASHBOARD**

### **Option 1: Replace Icon in Header**

Edit `app/dashboard/layout.tsx` (line 86-91):

**Before:**
```typescript
<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
  <span className="text-primary-foreground font-bold text-sm">AI</span>
</div>
```

**After (with image):**
```typescript
<img
  src="/logo.png"
  alt="Company Logo"
  className="h-8 w-auto"
/>
```

### **Option 2: Keep Both Icon and Name**
```typescript
<div className="flex items-center gap-3">
  <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg" />
  <div>
    <h1 className="text-lg font-semibold">Your Company</h1>
    <p className="text-xs text-muted-foreground">Dashboard</p>
  </div>
</div>
```

---

## 🚀 **8. QUICK BRANDING CHECKLIST**

Use this checklist when white-labeling:

### **Files to Replace:**
- [ ] `app/icon.png` - Your logo (512x512px)
- [ ] `app/apple-icon.png` - iOS icon (180x180px) - optional
- [ ] `public/logo.png` - Dashboard logo (if using images) - optional

### **Files to Edit:**
- [ ] `.env.local` - Update `NEXT_PUBLIC_SUPPORT_EMAIL`
- [ ] `app/layout.tsx` - Update title and description (line 20-22)
- [ ] `app/globals.css` - Update colors (line 12-13)
- [ ] `app/dashboard/layout.tsx` - Update header name (line 90)
- [ ] `app/page.tsx` - Update tagline (line 22)

### **Deployment:**
```bash
# After making changes:
git add .
git commit -m "Update branding"
git push

# Vercel will automatically deploy
```

---

## 🎨 **9. ADVANCED CUSTOMIZATION**

### **Change Font**

Edit `app/layout.tsx`:

```typescript
// Replace Geist font with your own
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Then use it:
<body className={inter.className}>
```

**Popular font choices:**
- `Inter` - Clean, modern
- `Poppins` - Friendly, rounded
- `Roboto` - Professional
- `Montserrat` - Bold, geometric

### **Add Company Footer**

Create `components/Footer.tsx`:

```typescript
export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; 2025 Your Company. All rights reserved.</p>
        <div className="flex gap-4 justify-center mt-2">
          <a href="/privacy" className="hover:text-foreground">Privacy</a>
          <a href="/terms" className="hover:text-foreground">Terms</a>
          <a href="/support" className="hover:text-foreground">Support</a>
        </div>
      </div>
    </footer>
  );
}
```

Then add to `app/dashboard/layout.tsx`:
```typescript
import { Footer } from '@/components/Footer';

// Inside layout:
<main className="flex-1 p-4 md:p-8 bg-background">
  {children}
</main>
<Footer />  {/* ← Add here */}
```

---

## 🖼️ **10. LOGO SIZE RECOMMENDATIONS**

### **For Best Results:**

| Location | Size | Format | Notes |
|----------|------|--------|-------|
| `app/icon.png` | 512x512px | PNG | Main favicon |
| `app/apple-icon.png` | 180x180px | PNG | iOS home screen |
| `public/logo.png` | 200x60px | PNG | Dashboard header (optional) |
| `public/logo-white.png` | 200x60px | PNG | Dark mode variant (optional) |

### **Tools to Create Icons:**

1. **Canva** - [canva.com](https://canva.com/) - Easy drag & drop
2. **Figma** - [figma.com](https://figma.com/) - Professional design
3. **Favicon Generator** - [favicon.io](https://favicon.io/) - Auto-generates all sizes
4. **ImageMagick** - Command line resizing:
   ```bash
   # Resize to 512x512
   convert logo.png -resize 512x512 icon.png

   # Resize to 180x180
   convert logo.png -resize 180x180 apple-icon.png
   ```

---

## 💡 **11. COMMON BRANDING QUESTIONS**

### **Q: Why isn't my favicon showing?**

**A:** Try these steps:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Verify `app/icon.png` exists and is 512x512px
4. Redeploy to Vercel
5. Wait 5 minutes for CDN to update

### **Q: Can I use an SVG logo?**

**A:** Yes! Add `app/icon.svg`:
```svg
<!-- app/icon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#3B82F6"/>
  <!-- Your logo here -->
</svg>
```

### **Q: How do I add a loading screen?**

**A:** Create `app/loading.tsx`:
```typescript
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.png" alt="Logo" className="h-16 mb-4 mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

---

## ✅ **12. TESTING YOUR BRANDING**

After making changes, test on:

- [ ] **Chrome** - Desktop & mobile
- [ ] **Safari** - Desktop & iPhone
- [ ] **Firefox** - Desktop
- [ ] **Edge** - Desktop
- [ ] **Mobile browsers** - Android & iOS

Check these specifically:
- [ ] Favicon appears in browser tab
- [ ] Logo appears in dashboard header
- [ ] Colors look good in light mode
- [ ] Colors look good in dark mode
- [ ] Support email is correct
- [ ] Company name appears everywhere

---

## 🎁 **13. BONUS: ONE-CLICK REBRAND SCRIPT**

Create a file `rebrand.js` in project root:

```javascript
// rebrand.js - Quick rebranding script
const fs = require('fs');
const path = require('path');

const config = {
  companyName: "Your Company Name",
  tagline: "Your custom tagline here",
  supportEmail: "support@yourcompany.com",
  primaryColor: "221.2 83.2% 53.3%",  // HSL format
};

// Update layout.tsx metadata
const layoutPath = './app/layout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');
layout = layout.replace(/title: ".*?"/, `title: "${config.companyName}"`);
layout = layout.replace(/description: ".*?"/, `description: "${config.tagline}"`);
fs.writeFileSync(layoutPath, layout);

console.log('✓ Updated app name and description');
console.log('✓ Manual steps remaining:');
console.log('  1. Replace app/icon.png with your logo');
console.log('  2. Update colors in app/globals.css if needed');
console.log('  3. Run: npm run dev to test');
```

**Usage:**
```bash
# Edit rebrand.js with your details, then:
node rebrand.js
```

---

## 🎯 **SUMMARY**

### **5-Minute Basic Branding:**
1. Replace `app/icon.png` with your logo
2. Edit `.env.local` - change support email
3. Edit `app/layout.tsx` - change title
4. Done!

### **15-Minute Full Branding:**
1. Replace all icons (icon.png, apple-icon.png)
2. Update colors in `app/globals.css`
3. Change company name in dashboard header
4. Update support email
5. Customize login page tagline
6. Test in browser
7. Deploy!

---

**Your buyers will love how easy this is to customize!** 🎨
