// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "avdbapi",
        "name": "AVDB JAV",
        "version": "1.0.0",
        "baseUrl": "https://avdbapi.com",
        "iconUrl": "https://avdbapi.com/favicon.ico",
        "isEnabled": true,
        "isAdult": true,
        "type": "VIDEO",
        "layoutType": "HORIZONTAL",
        "subtitleCat": true
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: '1', title: 'Censored', type: 'Horizontal', path: 'category' },
        { slug: '2', title: 'Uncensored', type: 'Horizontal', path: 'category' },
        { slug: '3', title: 'Uncensored Leaked', type: 'Horizontal', path: 'category' },
        { slug: '4', title: 'Amateur', type: 'Horizontal', path: 'category' },
        { slug: '5', title: 'Chinese AV', type: 'Horizontal', path: 'category' },
        { slug: '6', title: 'Western', type: 'Horizontal', path: 'category' },
        { slug: 'latest', title: 'Mới Cập Nhật', type: 'Grid', path: 'latest' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Censored', slug: '1' },
        { name: 'Uncensored', slug: '2' },
        { name: 'Uncensored Leaked', slug: '3' },
        { name: 'Amateur', slug: '4' },
        { name: 'Chinese AV', slug: '5' },
        { name: 'Western', slug: '6' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: 'Mới nhất', value: 'desc' },
            { name: 'Cũ nhất', value: 'asc' }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

var BASE_API = "https://avdbapi.com/api.php/provide/vod";

function getUrlList(slug, filtersJson) {
    try {
        var filters = JSON.parse(filtersJson || "{}");
        var page = filters.page || 1;
        var url = BASE_API + "?ac=detail&pg=" + page + "&pagesize=24";

        // Category filter (slug = category id: 1-6)
        if (/^[1-6]$/.test(slug)) {
            url += "&t=" + slug;
        } else if (slug === 'latest') {
            // Mới cập nhật - không cần filter category
        } else if (filters.category) {
            url += "&t=" + filters.category;
        }

        // Year filter
        if (filters.year) url += "&year=" + filters.year;

        // Sort direction
        if (filters.sort) url += "&sort_direction=" + filters.sort;

        return url;
    } catch (e) {
        return BASE_API + "?ac=detail&pg=1&pagesize=24";
    }
}

function getUrlSearch(keyword, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    // AVDBAPI hỗ trợ tìm bằng keyword (wd) cho JAV code hoặc tên
    return BASE_API + "?ac=detail&wd=" + encodeURIComponent(keyword) + "&pg=" + page + "&pagesize=24";
}

function getUrlDetail(slug) {
    // Tìm theo code/slug
    return BASE_API + "?ac=detail&wd=" + encodeURIComponent(slug) + "&pagesize=1";
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
        var list = response.list || [];

        var movies = list.map(function (item) {
            return {
                id: item.slug || item.movie_code || "",
                title: item.name || "",
                posterUrl: item.poster_url || "",
                backdropUrl: item.thumb_url || "",
                year: parseInt(item.year) || 0,
                quality: item.quality || "HD",
                episode_current: item.status || "",
                lang: ""
            };
        });

        var currentPage = parseInt(response.page) || 1;
        var totalItems = parseInt(response.total) || 0;
        var itemsPerPage = parseInt(response.limit) || 24;
        var totalPages = parseInt(response.pagecount) || Math.ceil(totalItems / itemsPerPage);

        return JSON.stringify({
            items: movies,
            pagination: {
                currentPage: currentPage,
                totalPages: totalPages,
                totalItems: totalItems,
                itemsPerPage: itemsPerPage
            }
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
        var list = response.list || [];
        if (list.length === 0) return "null";

        var movie = list[0];

        // Parse episodes từ cấu trúc AVDBAPI
        // episodes: { server_name: "VIP #1", server_data: { "Full": { slug, link_embed } } }
        var servers = [];
        var eps = movie.episodes;
        if (eps) {
            var serverEpisodes = [];
            var serverData = eps.server_data || {};

            // server_data là object với key = tên tập (vd: "Full", "Episode 1",...)
            for (var epName in serverData) {
                if (serverData.hasOwnProperty(epName)) {
                    var epInfo = serverData[epName];
                    var embedUrl = epInfo.link_embed || "";
                    if (embedUrl) {
                        serverEpisodes.push({
                            id: embedUrl,
                            name: epName,
                            slug: epInfo.slug || epName.toLowerCase()
                        });
                    }
                }
            }

            if (serverEpisodes.length > 0) {
                servers.push({
                    name: eps.server_name || "Server #1",
                    episodes: serverEpisodes
                });
            }
        }

        // Parse metadata
        var categories = Array.isArray(movie.category)
            ? movie.category.join(", ")
            : (movie.category || "");
        var countries = Array.isArray(movie.country)
            ? movie.country.join(", ")
            : (movie.country || "");
        var directors = Array.isArray(movie.director)
            ? movie.director.filter(function (d) { return d !== "Updating"; }).join(", ")
            : (movie.director || "");
        var actors = Array.isArray(movie.actor)
            ? movie.actor.filter(function (a) { return a !== "Updating"; }).join(", ")
            : (movie.actor || "");

        return JSON.stringify({
            id: movie.slug || movie.movie_code || "",
            title: movie.name || "",
            originName: movie.origin_name || "",
            posterUrl: movie.poster_url || "",
            backdropUrl: movie.thumb_url || "",
            description: (movie.description || "").replace(/<[^>]*>/g, ""),
            year: parseInt(movie.year) || 0,
            rating: 0,
            quality: movie.quality || "HD",
            duration: movie.time || "",
            servers: servers,
            episode_current: movie.status || "",
            lang: "",
            category: categories,
            country: countries,
            director: directors,
            casts: actors,
            status: movie.status || ""
        });
    } catch (error) { return "null"; }
}

// =============================================================================
// UPLOAD18 EMBED DECODER - Giải mã link gốc m3u8
// =============================================================================

function parseDetailResponse(embedHtml) {
    try {
        // Bước 1: Tìm PLAYER_CONFIG.m3u8 trong HTML embed upload18.org
        var m3u8Match = embedHtml.match(/m3u8:\s*["']([^"']+)["']/);

        if (m3u8Match && m3u8Match[1]) {
            var m3u8Path = m3u8Match[1];
            // m3u8Path = "/play/token_hash?hash=xxxx"
            // Cần gọi thêm endpoint này để lấy playlist thực tế

            // Trả về URL đầy đủ để app fetch tiếp
            var fullUrl = "https://upload18.org" + m3u8Path;

            return JSON.stringify({
                url: fullUrl,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Referer": "https://upload18.org/"
                },
                subtitles: []
            });
        }

        // Bước 2: Nếu response đã là m3u8 playlist trực tiếp (từ token_hash)
        if (embedHtml.indexOf("#EXTM3U") === 0 || embedHtml.indexOf("#EXT-X-") !== -1) {
            // Đây đã là nội dung m3u8, lấy URL segment đầu tiên để build base URL
            var segMatch = embedHtml.match(/(https?:\/\/[^\s]+)/);
            if (segMatch) {
                // Trả về nội dung m3u8 trực tiếp
                return JSON.stringify({
                    url: embedHtml,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": "https://upload18.org/"
                    },
                    subtitles: []
                });
            }
        }

        // Fallback: tìm link m3u8 bất kỳ
        var fallbackMatch = embedHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*?)["']/);
        if (fallbackMatch) {
            return JSON.stringify({
                url: fallbackMatch[1],
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://upload18.org/"
                },
                subtitles: []
            });
        }

        return "{}";
    } catch (error) { return "{}"; }
}

// =============================================================================
// CATEGORIES / COUNTRIES / YEARS (Hardcoded)
// =============================================================================

function parseCategoriesResponse(apiResponseJson) {
    var categories = [
        { name: "Censored", slug: "1" },
        { name: "Uncensored", slug: "2" },
        { name: "Uncensored Leaked", slug: "3" },
        { name: "Amateur", slug: "4" },
        { name: "Chinese AV", slug: "5" },
        { name: "Western", slug: "6" }
    ];
    return JSON.stringify(categories);
}

function parseCountriesResponse(apiResponseJson) {
    var countries = [
        { name: "Japan", value: "japan" },
        { name: "China", value: "china" },
        { name: "Western", value: "western" }
    ];
    return JSON.stringify(countries);
}

function parseYearsResponse(apiResponseJson) {
    var years = [];
    for (var i = 2026; i >= 2010; i--) {
        years.push({ name: i.toString(), value: i.toString() });
    }
    return JSON.stringify(years);
}
