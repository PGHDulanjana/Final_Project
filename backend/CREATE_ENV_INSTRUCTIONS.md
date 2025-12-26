# ⚠️ URGENT: Create .env File

## The Problem

Your backend server is failing because the `.env` file is missing!

Error message:
```
❌ MongoDB Connection Error: MONGO_URI is not defined in environment variables.
```

## ✅ Quick Fix

### Step 1: Create the .env File

**In the `backend/` folder**, create a new file named exactly `.env` (not `.env.txt`)

### Step 2: Copy This Content

Open the `.env` file and paste this:

```env
MONGO_URI=mongodb://localhost:27017/xpertkarate
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

### Step 3: Save the File

- Make sure the file is saved as `.env` (not `.env.txt`)
- Location: `backend/.env`

### Step 4: Restart Backend Server

The server should automatically restart (if using nodemon), or:
- Press `Ctrl+C` to stop
- Run `npm run dev` again

## 🎯 Expected Result

After creating the `.env` file, you should see:

```
✅ MongoDB Connected: localhost:27017
✅ XpertKarate Server running on port 5000
📦 Environment: development
```

## 📝 File Structure

Your backend folder should look like this:
```
backend/
  ├── .env          ← CREATE THIS FILE!
  ├── package.json
  ├── src/
  └── ...
```

## 🔍 How to Create .env File

### Windows (VS Code / Notepad++)
1. Open `backend/` folder
2. Create new file
3. Name it `.env` (with the dot at the start)
4. Paste the content above
5. Save

### Windows (Command Line)
```powershell
cd backend
New-Item -Path .env -ItemType File
# Then open .env in notepad and paste the content
notepad .env
```

### Mac/Linux (Terminal)
```bash
cd backend
cat > .env << 'EOF'
MONGO_URI=mongodb://localhost:27017/xpertkarate
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
EOF
```

## ⚠️ Important Notes

1. **File must be named `.env`** (not `env` or `.env.txt`)
2. **No spaces around the `=` sign** in the file
3. **No quotes needed** around values
4. **File location:** Must be in `backend/` folder (same level as `package.json`)

## 🐛 Still Not Working?

1. **Check file name:** Must be exactly `.env` (some editors add `.txt` extension)
2. **Check file location:** Must be in `backend/` folder
3. **Restart server:** Stop and start again after creating the file
4. **Check MongoDB:** Make sure MongoDB is running (`mongosh`)

## ✅ Verification

After creating the file, verify it exists:
```bash
# Windows
dir backend\.env

# Mac/Linux
ls -la backend/.env
```

You should see the `.env` file listed!

