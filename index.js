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

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 10000;

// Configuração do stealth
puppeteer.use(StealthPlugin());

console.log('🚀 Iniciando serviço de login Skoob...');

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        service: 'Skoob Login Service',
        version: '2.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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

async function performLogin(skoobUser, skoobPass) {
    let browser = null;
    
    console.log(`🔄 Iniciando login para: ${skoobUser}`);
    
    try {
        // Configuração otimizada para Render
        browser = await puppeteer.launch({
            headless: 'new',
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
                '--window-size=1280,720',
                '--single-process', // Importante para Render
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ],
            timeout: 60000
        });

        const page = await browser.newPage();
        
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);
        
        // User agent simples
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Otimização: bloqueia recursos pesados
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
            timeout: 60000 
        });

        // Aguarda elementos do formulário
        console.log('⏳ Aguardando formulário...');
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });

        // Preenche credenciais
        console.log('✏️ Preenchendo credenciais...');
        await page.type('#email', skoobUser, { delay: 50 });
        await page.waitForTimeout(500);
        await page.type('#senha', skoobPass, { delay: 50 });
        await page.waitForTimeout(500);

        console.log('🚀 Fazendo login...');
        
        // Submit do formulário
        await Promise.all([
            page.waitForNavigation({ 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            }),
            page.click('#login-form > div:nth-child(4) > button')
        ]);

        // Verifica sucesso do login
        const currentUrl = page.url();
        console.log(`📍 URL atual: ${currentUrl}`);
        
        if (currentUrl.includes('login')) {
            throw new Error('Login falhou - credenciais inválidas');
        }

        console.log('✅ Login realizado com sucesso!');

        // Extrai cookies
        const cookies = await page.cookies();
        const skoobCookie = cookies.find(c => c.name === 'CakeCookie[Skoob]');
        
        if (!skoobCookie) {
            throw new Error('Cookie de sessão não encontrado');
        }

        // Extrai user ID
        let userId = null;
        try {
            const decodedCookie = decodeURIComponent(skoobCookie.value);
            const cookieJson = JSON.parse(decodedCookie);
            userId = cookieJson.usuario?.id;
            
            if (!userId) {
                throw new Error('ID do usuário não encontrado');
            }
        } catch (e) {
            throw new Error('Erro ao processar cookie de sessão');
        }

        // Converte cookies para objeto
        const cookieObject = cookies.reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
        }, {});

        console.log(`🎉 Login concluído! User ID: ${userId}`);

        return {
            status: 'success',
            cookies: cookieObject,
            user_id: userId,
            message: 'Login realizado com sucesso'
        };

    } catch (error) {
        console.error(`❌ Erro no login: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log('🔒 Browser fechado');
            } catch (e) {
                console.error('Erro ao fechar browser:', e.message);
            }
        }
    }
}

// Endpoint principal
app.post('/api/login', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { skoob_user, skoob_pass } = req.body;

        if (!skoob_user || !skoob_pass) {
            return res.status(400).json({
                status: 'error',
                message: 'skoob_user e skoob_pass são obrigatórios'
            });
        }

        console.log('🎯 Processando login...');
        
        const result = await performLogin(skoob_user, skoob_pass);
        
        const duration = Date.now() - startTime;
        console.log(`⚡ Concluído em ${duration}ms`);
        
        res.status(200).json({
            ...result,
            duration_ms: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`💥 Erro após ${duration}ms: ${error.message}`);
        
        let statusCode = 500;
        if (error.message.includes('credenciais inválidas')) {
            statusCode = 401;
        } else if (error.message.includes('timeout')) {
            statusCode = 408;
        }
        
        res.status(statusCode).json({
            status: 'error',
            message: error.message,
            duration_ms: duration
        });
    }
});

// Middleware de erro
app.use((error, req, res, next) => {
    console.error('💥 Erro não tratado:', error);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM recebido, desligando...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT recebido, desligando...');
    process.exit(0);
});

// Inicia servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serviço rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Timeout do servidor
server.timeout = 120000; // 2 minutos