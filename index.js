// // login
// const express = require('express');
// // --- INÍCIO DA CORREÇÃO ---
// // Usamos o puppeteer-extra em vez do puppeteer normal
// const puppeteer = require('puppeteer-extra');
// // Adicionamos o plugin stealth
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// // --- FIM DA CORREÇÃO ---

// const app = express();
// app.use(express.json());

// const PORT = process.env.PORT || 10000;

// // --- CORREÇÃO ---
// // Ativamos o plugin stealth
// puppeteer.use(StealthPlugin());

// app.post('/api/login', async (req, res) => {
//   const { skoob_user, skoob_pass } = req.body;

//   if (!skoob_user || !skoob_pass) {
//     return res.status(400).json({ error: 'skoob_user e skoob_pass são obrigatórios.' });
//   }

//   let browser = null;
//   console.log("Iniciando o navegador Puppeteer em modo STEALTH...");

//   try {
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
//     });

//     const page = await browser.newPage();
//     await page.setDefaultNavigationTimeout(60000);

//     console.log("Navegando para a página de login do Skoob...");
//     await page.goto('https://www.skoob.com.br/login/', { waitUntil: 'networkidle2' });

//     console.log("Aguardando o formulário de login ficar visível...");
//     await page.waitForSelector('#email', { visible: true, timeout: 30000 });

//     console.log("Preenchendo credenciais...");
//     await page.type('#email', skoob_user);
//     await page.type('#senha', skoob_pass);

//     console.log("Submetendo o formulário...");
//     await Promise.all([
//       page.waitForNavigation({ waitUntil: 'networkidle2' }),
//       page.click('#login-form > div:nth-child(4) > button'),
//     ]);

//     if (page.url().includes('login')) {
//       throw new Error('Login falhou. Verifique as credenciais.');
//     }
//     console.log("Login bem-sucedido!");

//     const cookies = await page.cookies();
//     const skoobCookie = cookies.find(c => c.name === 'CakeCookie[Skoob]');
    
//     if (!skoobCookie) {
//         throw new Error('Cookie de sessão do Skoob não encontrado.');
//     }

//     const decodedCookie = decodeURIComponent(skoobCookie.value);
//     const cookieJson = JSON.parse(decodedCookie);
//     const userId = cookieJson.usuario?.id;

//     if (!userId) {
//         throw new Error('ID de utilizador não encontrado no cookie.');
//     }
//     console.log("Cookies e ID de utilizador extraídos com sucesso.");

//     res.status(200).json({
//       status: 'success',
//       cookies: cookies.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {}),
//       user_id: userId,
//     });

//   } catch (error) {
//     console.error("Erro durante a automação:", error.message);
//     res.status(500).json({ status: 'error', message: error.message });
//   } finally {
//     if (browser !== null) {
//       await browser.close();
//       console.log("Navegador fechado.");
//     }
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Servidor de login a correr na porta ${PORT}`);
// });
