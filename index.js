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

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 10000;
const REQUEST_TIMEOUT = 90000; // 90 segundos
const MAX_RETRIES = 2;

// Ativa o plugin stealth
puppeteer.use(StealthPlugin());

// Configurações otimizadas para Render
const getBrowserConfig = () => ({
    headless: 'new', // Usa o novo modo headless
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--window-size=1280,720'
    ],
    executablePath: process.env.NODE_ENV === 'production' ? executablePath() : undefined,
    timeout: REQUEST_TIMEOUT
});

// Função para delay humano
const humanDelay = (min = 100, max = 300) => 
    new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// Função principal de login com retry
async function performLogin(skoobUser, skoobPass, attempt = 1) {
    let browser = null;
    let page = null;
    
    console.log(`🔄 Tentativa ${attempt}/${MAX_RETRIES} - Iniciando login para: ${skoobUser}`);
    
    try {
        // Lança o browser
        browser = await puppeteer.launch(getBrowserConfig());
        page = await browser.newPage();
        
        // Configurações da página
        await page.setDefaultNavigationTimeout(REQUEST_TIMEOUT);
        await page.setDefaultTimeout(REQUEST_TIMEOUT);
        
        // User agent mais atualizado
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Headers extras para parecer mais humano
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        // Intercepta e bloqueia recursos desnecessários para velocidade
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log('🌐 Navegando para página de login...');
        await page.goto('https://www.skoob.com.br/login/', { 
            waitUntil: 'domcontentloaded',
            timeout: REQUEST_TIMEOUT 
        });

        // Aguarda o formulário aparecer
        console.log('⏳ Aguardando formulário de login...');
        await page.waitForSelector('#email', { 
            visible: true, 
            timeout: 30000 
        });

        // Delay antes de começar a digitar
        await humanDelay(500, 1000);

        // Limpa e preenche email
        console.log('✏️ Preenchendo credenciais...');
        await page.click('#email', { clickCount: 3 });
        await page.type('#email', skoobUser, { delay: 80 });
        
        await humanDelay(200, 500);
        
        // Limpa e preenche senha
        await page.click('#senha', { clickCount: 3 });
        await page.type('#senha', skoobPass, { delay: 90 });

        await humanDelay(300, 700);

        console.log('🚀 Submetendo formulário...');
        
        // Clica no botão de login e aguarda navegação
        const loginButton = await page.$('#login-form > div:nth-child(4) > button');
        if (!loginButton) {
            throw new Error('Botão de login não encontrado');
        }

        // Submete o formulário
        await Promise.all([
            page.waitForNavigation({ 
                waitUntil: 'domcontentloaded', 
                timeout: REQUEST_TIMEOUT 
            }),
            loginButton.click()
        ]);

        // Verifica se ainda está na página de login (indica falha)
        const currentUrl = page.url();
        console.log(`📍 URL atual após login: ${currentUrl}`);
        
        if (currentUrl.includes('login') || currentUrl.includes('erro')) {
            throw new Error('Credenciais inválidas ou login bloqueado');
        }

        console.log('✅ Login realizado com sucesso!');

        // Extrai cookies
        const cookies = await page.cookies();
        console.log(`🍪 Extraídos ${cookies.length} cookies`);

        // Encontra o cookie principal do Skoob
        const skoobCookie = cookies.find(c => c.name === 'CakeCookie[Skoob]');
        
        if (!skoobCookie) {
            throw new Error('Cookie de sessão do Skoob não encontrado após login');
        }

        // Decodifica o cookie para extrair user_id
        let userId = null;
        try {
            const decodedCookie = decodeURIComponent(skoobCookie.value);
            const cookieJson = JSON.parse(decodedCookie);
            userId = cookieJson.usuario?.id;
            
            if (!userId) {
                throw new Error('ID de usuário não encontrado no cookie');
            }
            
            console.log(`👤 ID do usuário extraído: ${userId}`);
        } catch (parseError) {
            console.error('Erro ao decodificar cookie:', parseError.message);
            throw new Error('Não foi possível extrair ID do usuário do cookie');
        }

        // Converte cookies para formato objeto
        const cookieObject = cookies.reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
        }, {});

        console.log('🎉 Login concluído com sucesso!');

        return {
            status: 'success',
            cookies: cookieObject,
            user_id: userId,
            message: 'Login realizado com sucesso'
        };

    } catch (error) {
        console.error(`❌ Erro na tentativa ${attempt}:`, error.message);
        
        // Se não é a última tentativa, tenta novamente
        if (attempt < MAX_RETRIES) {
            const retryDelay = attempt * 2000; // Delay progressivo
            console.log(`⏰ Aguardando ${retryDelay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            return performLogin(skoobUser, skoobPass, attempt + 1);
        }
        
        // Última tentativa falhou
        throw new Error(`Login falhou após ${MAX_RETRIES} tentativas: ${error.message}`);
        
    } finally {
        // Sempre fecha o browser
        if (browser) {
            try {
                await browser.close();
                console.log('🔒 Browser fechado');
            } catch (closeError) {
                console.error('Erro ao fechar browser:', closeError.message);
            }
        }
    }
}

// Middleware de logging
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        service: 'Skoob Login Service',
        version: '2.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Endpoint principal de login
app.post('/api/login', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { skoob_user, skoob_pass } = req.body;

        // Validação dos dados
        if (!skoob_user || !skoob_pass) {
            console.log('❌ Dados de login ausentes');
            return res.status(400).json({
                status: 'error',
                message: 'skoob_user e skoob_pass são obrigatórios'
            });
        }

        if (skoob_user.length < 3 || skoob_pass.length < 3) {
            console.log('❌ Credenciais muito curtas');
            return res.status(400).json({
                status: 'error',
                message: 'Credenciais inválidas'
            });
        }

        console.log('🎯 Iniciando processo de login...');
        
        // Executa o login
        const result = await performLogin(skoob_user, skoob_pass);
        
        const duration = Date.now() - startTime;
        console.log(`⚡ Login concluído em ${duration}ms`);
        
        // Retorna resultado de sucesso
        res.status(200).json({
            ...result,
            duration_ms: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`💥 Erro após ${duration}ms:`, error.message);
        
        // Determina o código de status baseado no erro
        let statusCode = 500;
        if (error.message.includes('Credenciais inválidas') || 
            error.message.includes('login bloqueado')) {
            statusCode = 401;
        } else if (error.message.includes('timeout') || 
                   error.message.includes('navegação')) {
            statusCode = 408;
        }
        
        res.status(statusCode).json({
            status: 'error',
            message: error.message,
            duration_ms: duration
        });
    }
});

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
    console.error('💥 Erro não tratado:', error);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Recebido SIGTERM, desligando graciosamente...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Recebido SIGINT, desligando graciosamente...');
    process.exit(0);
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serviço de login rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Timeout configurado: ${REQUEST_TIMEOUT}ms`);
    console.log(`🔄 Máximo de tentativas: ${MAX_RETRIES}`);
});