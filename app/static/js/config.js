// API配置
const API_KEY = 'sk-xxxxxx';
const BASE_URL = 'https://api.deepseek.com';

// Markdown配置
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, {
                    language: lang,
                    ignoreIllegals: true
                }).value;
            } catch (e) {
                console.error(e);
            }
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

export { API_KEY, BASE_URL }; 