const DEFAULT_BASE_URL = 'https://qa-a.recruitment.mediamarslab.com';

function normalizeBaseUrl(value) {
  const baseUrl = (value || DEFAULT_BASE_URL).trim();
  return baseUrl.replace(/\/+$/, '');
}

function getBaseUrl(env = process.env) {
  return normalizeBaseUrl(env.BASE_URL);
}

module.exports = {
  DEFAULT_BASE_URL,
  getBaseUrl,
};
