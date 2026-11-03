# Bando Casino

Personal play-money casino. Master account → bookie accounts → player accounts, table games, slots, and a sportsbook on ESPN lines.

## Run on your Mac
```
npm install
npm start
```
Open http://localhost:3000. With no database set, it runs on a temporary in-memory one that resets on restart.

## Put it online (Render + Neon)
1. **Database:** sign up at neon.tech (free), create a project, copy the connection string (starts with `postgresql://`).
2. **Code:** push this folder to a GitHub repo.
3. **Render:** New → Web Service → pick the repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables:
     - `DATABASE_URL` = your Neon connection string
     - `SESSION_SECRET` = any long random string
     - `NODE_ENV` = `production`
4. Open the site. The first visit asks you to create the master account.

## House rules
- Table game and slot bets over 250 lose about 95% of the time (`BIG` in `public/app.js`).
- Slots pay back around 87–89%.
- Sports bets settle automatically about every 10 minutes after games go final.
