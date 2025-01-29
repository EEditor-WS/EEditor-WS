const DISCORD_CLIENT_ID = '1333948751919972434';
const DISCORD_REDIRECT_URI = window.location.origin + '/auth/discord/callback';
const GITHUB_REPO = 'EE-Apps/ws-eeditor.accounts';
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

    async saveToGithub(userData) {
        console.log('🌐 Начало сохранения в GitHub...');
        const filename = `users/${userData.id}.json`;
        
        try {
            const githubToken = await getGithubToken();
            if (!githubToken) {
                console.error('❌ Не удалось получить токен GitHub');
                throw new Error('Не удалось получить токен GitHub');
            }

            console.log('🔑 Токен GitHub получен успешно');
            console.log('🔍 Проверка существующего файла...');

            // Сначала проверяем, существует ли файл
            let sha = null;
            try {
                const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`, {
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });

                if (checkResponse.ok) {
                    const fileData = await checkResponse.json();
                    sha = fileData.sha;
                    console.log('📄 Найден существующий файл, SHA:', sha);
                } else if (checkResponse.status !== 404) {
                    const errorText = await checkResponse.text();
                    console.error('❌ Ошибка проверки файла:', errorText);
                    throw new Error(`GitHub API error: ${checkResponse.status} ${errorText}`);
                }

                // Подготавливаем данные для сохранения
                console.log('📝 Подготовка данных...');
                const dataToSave = {
                    id: userData.id,
                    username: userData.username,
                    displayName: userData.displayName,
                    avatar: userData.avatar,
                    lastUpdate: new Date().toISOString()
                };

                const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSave, null, 2))));

                const body = {
                    message: `Update user data for ${userData.username}`,
                    content: content,
                    branch: 'main'
                };

                if (sha) {
                    body.sha = sha;
                }

                console.log('📤 Отправка данных в GitHub...');
                const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Ошибка сохранения в GitHub:', errorText);
                    throw new Error(`GitHub API error: ${response.status} ${errorText}`);
                }

                console.log('✅ Данные успешно сохранены в GitHub');
                return true;
            } catch (apiError) {
                console.error('❌ Ошибка при работе с GitHub API:', apiError);
                throw apiError;
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения в GitHub:', error);
            throw error;
        }
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
            
            // Сохраняем в GitHub
            await this.saveToGithub(userData);

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
                    accessToken: await window.cryptoManager.encrypt(accessToken, this.encryptionKey)
                };

                if (await this.saveUserData(userData)) {
                    console.log('✅ Авторизация успешно завершена');
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
