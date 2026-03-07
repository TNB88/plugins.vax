// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "phim4k_vip",
        "name": "Phim4K VIP",
        "version": "1.0.0",
        "baseUrl": "https://stremio.phim4k.xyz",
        "iconUrl": "https://phim4k.com/favicon.ico",
        "isEnabled": true,
        "type": "MOVIE"
    });
}

// Token xác thực VIP từ dữ liệu của bạn
const AUTH_TOKEN = "eyJ1c2VybmFtZSI6Imh1bmciLCJwYXNzd29yZCI6Imh1bmciLCJ0cyI6MTc2NDcyNTIxNDA1NX0";

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim4k_movies', title: 'Phim4K Movies', type: 'Horizontal', path: 'catalog/movie' },
        { slug: 'phim4k_series', title: 'Phim4K Series', type: 'Horizontal', path: 'catalog/series' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Phim lẻ', slug: 'phim4k_movies' },
        { name: 'Phim bộ', slug: 'phim4k_series' },
        { name: 'Hành động', slug: 'Action & Adventure' },
        { name: 'Viễn tưởng', slug: 'Sci-Fi & Fantasy' },
        { name: 'Kinh dị', slug: 'Horror' },
        { name: 'Hoạt hình', slug: 'Animation' },
        { name: 'Hài hước', slug: 'Comedy' },
        { name: 'Tội phạm', slug: 'Crime' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: 'Mới cập nhật', value: 'update' }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var type = (slug === 'phim4k_series') ? 'series' : 'movie';
    
    // Nếu slug là một thể loại (genre)
    if (slug !== 'phim4k_movies' && slug !== 'phim4k_series') {
        return "https://stremio.phim4k.xyz/" + AUTH_TOKEN + "/catalog/" + type + "/phim4k_" + type + "s/genre=" + encodeURIComponent(slug) + ".json";
    }

    return "https://stremio.phim4k.xyz/" + AUTH_TOKEN + "/catalog/" + type + "/" + slug + ".json";
}

function getUrlSearch(keyword, filtersJson) {
    return "https://stremio.phim4k.xyz/" + AUTH_TOKEN + "/catalog/movie/phim4k_movies/search=" + encodeURIComponent(keyword) + ".json";
}

function getUrlDetail(id) {
    var type = id.indexOf('series') > -1 ? 'series' : 'movie';
    return "https://stremio.phim4k.xyz/" + AUTH_TOKEN + "/meta/" + type + "/" + id + ".json";
}

// Bổ sung hàm lấy stream theo cấu trúc chuẩn của plugin
function getUrlStream(id) {
    var type = id.indexOf('series') > -1 ? 'series' : 'movie';
    return "https://stremio.phim4k.xyz/" + AUTH_TOKEN + "/stream/" + type + "/" + id + ".json";
}

function getUrlCategories() { return ""; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// PARSERS
// =============================================================================

function parseListResponse(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var items = response.metas || [];

        var movies = items.map(function (item) {
            return {
                id: item.id,
                title: item.name,
                posterUrl: item.poster || "",
                backdropUrl: item.background || "",
                year: item.name.match(/\((\d{4})\)/) ? item.name.match(/\((\d{4})\)/)[1] : 0,
                quality: "4K/Bluray",
                episode_current: "Full",
                lang: "Vietsub"
            };
        });

        return JSON.stringify({
            items: movies,
            pagination: { currentPage: 1, totalPages: 1, totalItems: movies.length, itemsPerPage: 20 }
        });
    } catch (error) {
        return JSON.stringify({ items: [], pagination: { currentPage: 1, totalPages: 1 } });
    }
}

function parseSearchResponse(apiResponseJson) {
    return parseListResponse(apiResponseJson);
}

function parseMovieDetail(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var meta = response.meta || {};

        // Đối với Stremio API, danh sách tập phim (nếu là series) nằm trong meta.videos
        // Nhưng ở đây ta sẽ trả về cấu trúc server để giống với ophim.js
        var servers = [{
            name: "Phim4K VIP",
            episodes: [{ id: meta.id, name: "Full", slug: meta.id }]
        }];

        return JSON.stringify({
            id: meta.id,
            title: meta.name,
            posterUrl: meta.poster || "",
            backdropUrl: meta.background || "",
            description: (meta.description || "").replace(/<[^>]*>/g, ""),
            year: meta.year || 0,
            rating: meta.imdbRating || 0,
            quality: "4K",
            servers: servers,
            category: (meta.genres || []).join(", "),
            country: meta.country || "",
            director: (meta.director || []).join(", "),
            casts: (meta.cast || []).join(", ")
        });
    } catch (error) { return "null"; }
}

function parseDetailResponse(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var streams = response.streams || [];
        
        var streamUrl = "";
        if (streams.length > 0) {
            // Lấy stream đầu tiên (thường là chất lượng cao nhất của Phim4K)
            streamUrl = streams[0].url || "";
        }

        return JSON.stringify({
            url: streamUrl,
            headers: { 
                "User-Agent": "Stremio/1.6.0", 
                "Referer": "https://phim4k.com" 
            },
            subtitles: []
        });
    } catch (error) { return "{}"; }
}

function getImageUrl(path) {
    return path || "";
}
