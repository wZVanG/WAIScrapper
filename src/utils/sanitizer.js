class Sanitizer {
    static sanitizeQuery(query) {
        if (!query) return 'inteligencia artificial peru';
        return query.slice(0, 100).replace(/[^\w\s]/gi, '');
    }
}

module.exports = Sanitizer;