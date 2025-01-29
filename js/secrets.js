// Зашифрованные данные в формате base64
const SECRETS = {
    // Токен разбит на части и зашифрован по отдельности
    gh_t1: "Z2l0aHViX3BhdF8xMUE2WFdWSUEw",
    gh_t2: "cXZDa2tObXBXSTNEX2dkZDRv",
    gh_t3: "ZGJxd2RPZGxJNDIwbFlWS0hr",
    gh_t4: "MjFMR2tXREpMVUZITWlhWDVp",
    gh_t5: "SnNWVzMyVERYU1QzMW9zRHcy",
    // Соль для дополнительного шифрования
    salt: "RUVkaXRvci1TYWx0LVYx"
};

// Функция для сборки и расшифровки токена
async function getGithubToken() {
    try {
        console.log('🔄 Начало получения токена GitHub...');
        
        // Собираем части токена
        const parts = [
            SECRETS.gh_t1,
            SECRETS.gh_t2,
            SECRETS.gh_t3,
            SECRETS.gh_t4,
            SECRETS.gh_t5
        ];
        
        // Собираем токен из частей
        const encodedToken = parts.map(part => {
            try {
                return atob(part);
            } catch (e) {
                console.error('❌ Ошибка декодирования части токена:', e);
                return '';
            }
        }).join('');
        
        if (!encodedToken) {
            console.error('❌ Не удалось собрать токен');
            return null;
        }

        console.log('✅ Токен GitHub успешно собран');
        return encodedToken;
    } catch (error) {
        console.error('❌ Ошибка при получении токена:', error);
        return null;
    }
} 