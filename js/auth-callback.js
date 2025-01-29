const DISCORD_CLIENT_ID = '1333948751919972434';
const DISCORD_REDIRECT_URI = window.location.origin + '/auth/discord/callback';
const COOKIE_NAME = 'ee_auth';
const COOKIE_EXPIRES_DAYS = 30;

class AuthCallback {
    constructor() {
        this.encryptionKey = window.cryptoManager.generateRandomPassword();
        this.handleCallback();
    }

    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
        console.log('🍪 Cookie сохранены');
    }

    async saveToLocalStorage(data) {
        localStorage.setItem('userData', data);
        console.log('💾 Данные сохранены в localStorage');
    }

    async saveUserData(userData) {
        console.log('🔄 Начало сохранения данных пользователя...');
        try {
            const encryptedData = await window.cryptoManager.encrypt(userData, this.encryptionKey);
            console.log('🔐 Данные зашифрованы');
            
            // Сохраняем в Cookie
            this.setCookie(COOKIE_NAME, encryptedData, COOKIE_EXPIRES_DAYS);
            
            // Сохраняем в localStorage
            await this.saveToLocalStorage(encryptedData);

            console.log('✅ Все данные успешно сохранены');
            return true;
        } catch (error) {
            console.error('❌ Ошибка при сохранении данных:', error);
            return false;
        }
    }

    async handleCallback() {
        console.log('🔄 Начало обработки callback...');
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get('access_token');

        if (accessToken) {
            console.log('🔑 Получен токен доступа Discord');
            try {
                const response = await fetch('https://discord.com/api/users/@me', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    console.error('❌ Ошибка получения данных пользователя Discord');
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                console.log('👤 Получены данные пользователя Discord:', {
                    id: data.id,
                    username: data.username,
                    displayName: data.global_name || data.username
                });

                const userData = {
                    id: data.id,
                    username: data.username,
                    displayName: data.global_name || data.username,
                    avatar: `https://cdn.discord.com/avatars/${data.id}/${data.avatar}.png`,
                    accessToken: await window.cryptoManager.encrypt(accessToken, this.encryptionKey),
                    lastUpdate: new Date().toISOString()
                };

                if (await this.saveUserData(userData)) {
                    console.log('✅ Авторизация успешно завершена, перенаправление на главную страницу...');
                    window.location.href = '/';
                } else {
                    console.error('❌ Ошибка сохранения данных');
                    document.body.innerHTML = '<h1>Ошибка авторизации</h1><p>Не удалось сохранить данные пользователя</p>';
                }
            } catch (error) {
                console.error('❌ Ошибка авторизации:', error);
                document.body.innerHTML = '<h1>Ошибка авторизации</h1><p>' + error.message + '</p>';
            }
        } else {
            console.error('❌ Токен доступа не найден в URL');
            document.body.innerHTML = '<h1>Ошибка авторизации</h1><p>Токен доступа не найден</p>';
        }
    }
}

// Создаем экземпляр для обработки callback
window.authCallback = new AuthCallback(); 
