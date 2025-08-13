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

// Usar plugin stealth para evitar detecção
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 10000;

// Função de login no Skoob
async function loginSkoob(email, password) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Configurar viewport e user agent
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Navegando para página de login...');
        await page.goto('https://www.skoob.com.br/usuario/login', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Aguardar a página carregar completamente
        await page.waitForTimeout(3000);

        // Tentar múltiplos seletores para o campo email
        const emailSelectors = [
            '#email',
            'input[name="email"]',
            'input[type="email"]',
            '.form-control[name="email"]',
            '#login-email',
            '.email-input'
        ];

        let emailField = null;
        for (const selector of emailSelectors) {
            try {
                console.log(`Testando seletor: ${selector}`);
                await page.waitForSelector(selector, { timeout: 5000 });
                emailField = selector;
                console.log(`✓ Campo email encontrado com seletor: ${selector}`);
                break;
            } catch (error) {
                console.log(`✗ Seletor ${selector} não encontrado`);
            }
        }

        if (!emailField) {
            // Debug: capturar screenshot e HTML
            await page.screenshot({ path: 'debug-page.png', fullPage: true });
            const html = await page.content();
            console.log('HTML da página:', html.substring(0, 1000) + '...');
            throw new Error('Campo de email não encontrado com nenhum seletor');
        }

        // Preencher email
        console.log('Preenchendo email...');
        await page.type(emailField, email, { delay: 100 });

        // Tentar múltiplos seletores para senha
        const passwordSelectors = [
            '#password',
            'input[name="password"]',
            'input[type="password"]',
            '.form-control[name="password"]',
            '#login-password',
            '.password-input'
        ];

        let passwordField = null;
        for (const selector of passwordSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                passwordField = selector;
                console.log(`✓ Campo senha encontrado com seletor: ${selector}`);
                break;
            } catch (error) {
                console.log(`✗ Seletor ${selector} não encontrado`);
            }
        }

        if (!passwordField) {
            throw new Error('Campo de senha não encontrado');
        }

        // Preencher senha
        console.log('Preenchendo senha...');
        await page.type(passwordField, password, { delay: 100 });

        // Aguardar um pouco antes de clicar
        await page.waitForTimeout(1000);

        // Tentar múltiplos seletores para botão de login
        const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            '.btn-login',
            '#login-button',
            'button:contains("Entrar")',
            'input[value*="Entrar"]'
        ];

        let submitButton = null;
        for (const selector of submitSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                submitButton = selector;
                console.log(`✓ Botão submit encontrado com seletor: ${selector}`);
                break;
            } catch (error) {
                console.log(`✗ Seletor ${selector} não encontrado`);
            }
        }

        if (!submitButton) {
            // Tentar pressionar Enter no campo de senha
            console.log('Tentando enviar formulário com Enter...');
            await page.focus(passwordField);
            await page.keyboard.press('Enter');
        } else {
            console.log('Clicando no botão de login...');
            await page.click(submitButton);
        }

        // Aguardar redirecionamento ou mensagem de erro
        try {
            await page.waitForNavigation({ 
                waitUntil: 'networkidle0', 
                timeout: 30000 
            });
            
            console.log('Login realizado com sucesso!');
            console.log('URL atual:', page.url());
            
            return {
                success: true,
                message: 'Login realizado com sucesso',
                url: page.url()
            };
            
        } catch (navError) {
            // Verificar se há mensagem de erro na página
            const errorMessages = await page.$$eval('.error, .alert-danger, .text-danger', 
                elements => elements.map(el => el.textContent.trim())
            ).catch(() => []);
            
            if (errorMessages.length > 0) {
                throw new Error(`Erro de login: ${errorMessages.join(', ')}`);
            }
            
            // Se não houve navegação, pode ser que o login tenha falhado silenciosamente
            const currentUrl = page.url();
            if (currentUrl.includes('login')) {
                throw new Error('Login falhou - ainda na página de login');
            }
            
            return {
                success: true,
                message: 'Login possivelmente realizado',
                url: currentUrl
            };
        }

    } catch (error) {
        console.error('Erro durante login:', error.message);
        
        // Capturar screenshot para debug
        try {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            console.log('Screenshot de erro salva como error-screenshot.png');
        } catch (screenshotError) {
            console.log('Não foi possível capturar screenshot');
        }
        
        throw error;
    } finally {
        await browser.close();
    }
}

// Middleware do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas as requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rota principal de login
app.post('/login', async (req, res) => {
    console.log('📧 Iniciando login para:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email e senha são obrigatórios'
            });
        }
        
        console.log('🔄 Processando login...');
        const result = await loginSkoob(email, password);
        
        console.log('✅ Login bem-sucedido');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Erro no login:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota de teste (GET) - para debug
app.get('/test-login', async (req, res) => {
    const testEmail = req.query.email || 'test@example.com';
    const testPassword = req.query.password || 'testpassword';
    
    console.log('🧪 Teste de login iniciado...');
    
    try {
        const result = await loginSkoob(testEmail, testPassword);
        res.json({
            message: 'Teste concluído',
            result
        });
    } catch (error) {
        res.status(500).json({
            message: 'Erro no teste',
            error: error.message
        });
    }
});

// Middleware de erro global
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Serviço de login Skoob iniciado');
    console.log(`📡 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('📋 Rotas disponíveis:');
    console.log('   GET  /health - Health check');
    console.log('   POST /login - Login no Skoob');
    console.log('   GET  /test-login - Teste de login');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Recebido SIGTERM, encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Recebido SIGINT, encerrando servidor...');
    process.exit(0);
});