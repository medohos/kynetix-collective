================================================================================
  KYNETIX COLLECTIVE - COMPLETE SETUP & RUN GUIDE
  Egyptian Athletic Sportswear E-Commerce Platform
================================================================================

This guide covers everything you need to set up, run, and access Kynetix Collective 
on your PC and test it on your mobile phone over the same local Wi-Fi network.

--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------
1. System Overview & Architecture
2. Prerequisites (XAMPP & Node.js)
3. Step 1: Setting up XAMPP & Importing MySQL Database
4. Step 2: Starting the Node.js Backend Server
5. Step 3: Accessing the Website on Localhost
6. Step 4: Admin & Demo Accounts
7. Step 5: How to Access and Test on Mobile via Wi-Fi IP
8. Renaming the Project Folder
9. Troubleshooting & FAQ


================================================================================
1. SYSTEM OVERVIEW & ARCHITECTURE
================================================================================
- Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3 (Mobile-First Responsive)
- Backend:  Node.js + Express (MVC Pattern) running on Port 3000
- Database: MySQL / MariaDB via XAMPP running on Port 3306
  - Database Name: `kynetix_collective`
  - Database Schema: `kynetix_schema.sql` (included in project root)


================================================================================
2. PREREQUISITES (DOWNLOAD & INSTALL)
================================================================================
1. XAMPP (for Apache & MySQL):
   - Download from: https://www.apachefriends.org/download.html
   - Recommended: XAMPP for Windows (with PHP 8.x and MariaDB/MySQL).
   - Run the installer with default settings (installs to `C:\xampp`).

2. Node.js (for the Express MVC backend server):
   - Download from: https://nodejs.org/
   - Recommended: LTS (Long Term Support) version.
   - Run the installer, accept default settings, and ensure "Add to PATH" is checked.
   - Verify installation by opening a new Command Prompt or PowerShell and running:
       node -v
       npm -v


================================================================================
3. STEP 1: SETTING UP XAMPP & IMPORTING THE DATABASE
================================================================================
1. Start XAMPP:
   - Open "XAMPP Control Panel" (Right-click and select "Run as administrator").
   - Click "Start" next to Apache.
   - Click "Start" next to MySQL.
   - Both module labels should turn green.

2. Open phpMyAdmin:
   - In your browser, open: http://localhost/phpmyadmin/

3. Create the Database:
   - Click "New" on the left sidebar.
   - In "Database name", type: kynetix_collective
   - Set Collation to: utf8mb4_unicode_ci (or utf8mb4_general_ci).
   - Click "Create".

4. Import the Schema & Products:
   - With `kynetix_collective` selected in phpMyAdmin, click the "Import" tab at the top.
   - Click "Choose File" and select `kynetix_schema.sql` located inside the project folder:
       C:\xampp\htdocs\kynetix-collective\kynetix_schema.sql
   - Scroll down and click "Import" (or "Go").
   - You will see green success messages confirming all 28 products, categories, 
     variants, admin credentials, coupons, and orders have been imported.


================================================================================
4. STEP 2: STARTING THE NODE.JS BACKEND SERVER
================================================================================
You have two easy ways to start the server:

OPTION A: DOUBLE-CLICK THE BATCH FILE (EASIEST)
-----------------------------------------------
1. In File Explorer, go to the project folder.
2. Double-click `start-server.bat`.
3. A command window will open showing:
     =====================================================
       KYNETIX COLLECTIVE - NODE.JS MVC SERVER
     =====================================================
       Status:  ONLINE
       Port:    3000
       Mode:    development
       Web UI:  http://localhost:3000/
       API:     http://localhost:3000/api/health
     =====================================================
4. Leave this window open while using the website.

OPTION B: VIA COMMAND PROMPT OR POWERSHELL
------------------------------------------
1. Open PowerShell or Command Prompt.
2. Navigate to the project folder:
     cd "C:\xampp\htdocs\kynetix-collective"
3. (First time only) Install required packages if not already present:
     npm install
4. Start the server:
     node server.js
   (or for auto-reload during development: `npm run dev`)


================================================================================
5. STEP 3: ACCESSING THE WEBSITE ON LOCALHOST
================================================================================
Once both XAMPP MySQL and Node.js are running, open your web browser:

- Home Page:        http://localhost:3000/
- Shop Catalog:     http://localhost:3000/shop.html
- Men's Apparel:    http://localhost:3000/shop.html?category=Men
- Women's Apparel:  http://localhost:3000/shop.html?category=Women
- Kids' Collection: http://localhost:3000/shop.html?category=Kids
- Accessories:      http://localhost:3000/shop.html?category=Accessories
- Admin Dashboard:  http://localhost:3000/admin.html
- Health Check:     http://localhost:3000/api/health


================================================================================
6. STEP 4: ADMIN & DEMO ACCOUNTS
================================================================================
ADMIN ACCOUNT (Redirects directly to the Admin Management Panel):
- Email:    admin@kynetix.eg
- Password: kynetix
* Note: Signing in with this email automatically opens `admin.html`, allowing
  you to view orders, edit stock, manage products, and create coupon codes.

CUSTOMER ACCOUNT (Ammar):
- Email:    ammar@kynetix (or ammar@kynetix.eg)
- Password: kynetix

SAMPLE COUPON CODES (Test at checkout):
- EGYPT10  (10% off entire order)
- RUNFAST  (15% off running gear)
- WELCOME  (Free shipping on orders over 1000 EGP)


================================================================================
7. STEP 5: HOW TO ACCESS AND TEST ON MOBILE (SAME WI-FI NETWORK)
================================================================================
You can browse the store, add items to cart, and test responsive UI directly 
on your smartphone or tablet connected to the same Wi-Fi as your PC.

STEP A: FIND YOUR PC'S LOCAL IP ADDRESS
1. On your PC, press Windows Key + R, type `cmd` and press Enter.
2. In the Command Prompt, type:
     ipconfig
   and press Enter.
3. Look for your active network connection (usually "Wireless LAN adapter Wi-Fi" 
   or "Ethernet adapter").
4. Note the "IPv4 Address", for example:
     IPv4 Address. . . . . . . . . . . : 192.168.1.15

STEP B: ALLOW NODE.JS THROUGH WINDOWS DEFENDER FIREWALL
If your phone cannot load the page, Windows Firewall is blocking incoming connections:
1. Press Windows Key, search for "Allow an app through Windows Firewall", and press Enter.
2. Click "Change settings" (with the administrator shield).
3. Find "Node.js JavaScript Runtime" in the list.
4. Check BOTH checkboxes ("Private" and "Public").
5. Click "OK".
*(Alternatively, you can add an Inbound Rule in Windows Firewall for TCP Port 3000).*

STEP C: OPEN ON YOUR PHONE
1. Ensure your phone is connected to the EXACT same Wi-Fi router as your PC.
2. Open Safari (iOS) or Chrome (Android) on your phone.
3. In the URL address bar, enter your PC's IP address followed by `:3000`:
     http://192.168.1.15:3000/
   (Replace `192.168.1.15` with the actual IPv4 address from Step A).
4. You will see the fully mobile-responsive Kynetix Collective store!

================================================================================
9. TROUBLESHOOTING & FAQ
================================================================================
Q1: "Database connection failed" or EACCES error when starting Node server.
A: Ensure MySQL is running in XAMPP Control Panel. Test phpMyAdmin in your 
   browser at http://localhost/phpmyadmin/ to ensure MySQL is healthy.

Q2: Port 3000 is already in use.
A: If another process or previous Node session is holding port 3000:
   - In PowerShell, run: 
       Get-Process -Name node | Stop-Process -Force
   - Then run `node server.js` again.

Q3: Mobile phone says "This site can’t be reached" (ERR_CONNECTION_TIMED_OUT).
A: Check three things:
   1. Are both phone and PC on the SAME Wi-Fi network? (Not mobile data 4G/5G).
   2. Did you use `http://` and port `:3000`? (e.g., `http://192.168.1.X:3000/`).
   3. Check Windows Firewall: allow Node.js or allow inbound TCP port 3000.

Q4: Product changes or images don't appear in the browser.
A: Hard refresh the page to bypass cached assets:
   - Windows Chrome/Edge: Ctrl + F5
   - Mac Chrome/Safari: Cmd + Shift + R
   - Mobile: Clear browsing cache or open in Incognito/Private tab.

================================================================================
   Built with pride for Kynetix Collective - Cairo, Egypt
================================================================================
