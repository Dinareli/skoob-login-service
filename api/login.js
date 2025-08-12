const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');

// Função principal que a Vercel irá executar
module.exports = async (req, res) => {
  // Apenas permite pedidos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { skoob_user, skoob_pass } = req.body;

  if (!skoob_user || !skoob_pass) {
    return res.status(400).json({ error: 'skoob_user e skoob_pass são obrigatórios.' });
  }

  let browser = null;
  console.log("Iniciando o navegador Puppeteer...");

  try {
    // Configurações para o Puppeteer rodar no ambiente da Vercel
    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });

    const page = await browser.newPage();
    console.log("Navegando para a página de login do Skoob...");
    await page.goto('https://www.skoob.com.br/login/', { waitUntil: 'networkidle2' });

    console.log("Preenchendo credenciais...");
    await page.type('#email', skoob_user);
    await page.type('#senha', skoob_pass);

    console.log("Submetendo o formulário...");
    // Clica no botão e espera a navegação para a próxima página
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#login-form > div:nth-child(4) > button'),
    ]);

    // Verifica se o login foi bem-sucedido
    if (page.url().includes('login')) {
      throw new Error('Login falhou. Verifique as credenciais.');
    }
    console.log("Login bem-sucedido!");

    // Obtém os cookies
    const cookies = await page.cookies();
    const skoobCookie = cookies.find(c => c.name === 'CakeCookie[Skoob]');
    
    if (!skoobCookie) {
        throw new Error('Cookie de sessão do Skoob não encontrado.');
    }

    // Decodifica o cookie para extrair o ID do utilizador
    const decodedCookie = decodeURIComponent(skoobCookie.value);
    const cookieJson = JSON.parse(decodedCookie);
    const userId = cookieJson.usuario?.id;

    if (!userId) {
        throw new Error('ID de utilizador não encontrado no cookie.');
    }
    console.log("Cookies e ID de utilizador extraídos com sucesso.");

    // Envia a resposta de sucesso
    res.status(200).json({
      status: 'success',
      cookies: cookies.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {}),
      user_id: userId,
    });

  } catch (error) {
    console.error("Erro durante a automação:", error);
    res.status(500).json({ status: 'error', message: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
      console.log("Navegador fechado.");
    }
  }
};
