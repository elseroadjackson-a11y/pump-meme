# pump.meme

Real pump.fun coins, real SOL, signed by your Phantom wallet. Runs on your computer only.

## Run it
1. Install Node 18+.
2. `npm install`
3. Get a free RPC URL (Helius or QuickNode). The public Solana RPC blocks sending.
4. `RPC_URL="https://your-rpc-url" npm start` (Windows PowerShell: `$env:RPC_URL="..."; npm start`)
5. Open http://localhost:3000

## Wallet setup
- In Phantom, add a new account (e.g. "pump project") and connect that one. Send SOL to its address from your exchange or main wallet. That is your deposit.
- Launching with "separate wallet per coin" creates a new keypair in this browser, funds it from Phantom, and launches from it. Those keys sit in this browser's localStorage. Use "Download backup" in the Coin wallets panel, and never clear site data while they hold SOL.
- Coins you launch are sell-only in the UI.

## Before real money
Untested against live mainnet. Try 0.01 SOL first. Most coins on pump.fun go to zero, so only use SOL you can lose. Every trade asks for a confirmation and Phantom asks again.

## Site keys
Nobody gets in without a key, and each person gets their own.
- Make one: `node keys.js add sarah` (prints the key once, copy it then)
- See who has one: `node keys.js list`
- Lock someone out: `node keys.js revoke sarah` (works immediately)
Make one for yourself first. Keys are stored hashed in `keys.json`, so keep that file and `secret.txt` private.
