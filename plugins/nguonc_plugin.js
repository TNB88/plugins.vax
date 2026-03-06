// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "nguonc",
        "name": "Phim NguonC",
        "version": "1.0.6",
        "baseUrl": "https://phim.nguonc.com",
        "iconUrl": "https://stpaulclinic.vn/vaapp/plugins/nguonC.png",
        "isEnabled": true,
        "type": "MOVIE"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-moi-cap-nhat', title: 'Phim Mới Cập Nhật', type: 'Grid', path: 'phim-moi-cap-nhat' },
        { slug: 'phim-dang-chieu', title: 'Phim Đang Chiếu', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'phim-le', title: 'Phim Lẻ', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'phim-bo', title: 'Phim Bộ', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'hoat-hinh', title: 'Hoạt Hình', type: 'Horizontal', path: 'the-loai' }
    ]);
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    try {
        var filters = JSON.parse(filtersJson || "{}");
        var page = filters.page || 1;
        var sort = filters.sort || "updated";

        if (slug === 'phim-moi-cap-nhat') {
            return "https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=" + page;
        }
        if (filters.category) return "https://phim.nguonc.com/api/films/the-loai/" + filters.category + "?page=" + page + "&sort=" + sort;
        if (filters.country) return "https://phim.nguonc.com/api/films/quoc-gia/" + filters.country + "?page=" + page + "&sort=" + sort;
        if (filters.year) return "https://phim.nguonc.com/api/films/nam-phat-hanh/" + filters.year + "?page=" + page + "&sort=" + sort;

        var listSlugs = ['phim-le', 'phim-bo', 'phim-dang-chieu', 'tv-shows'];
        if (listSlugs.indexOf(slug) >= 0) return "https://phim.nguonc.com/api/films/danh-sach/" + slug + "?page=" + page + "&sort=" + sort;

        return "https://phim.nguonc.com/api/films/the-loai/" + slug + "?page=" + page + "&sort=" + sort;
    } catch (e) {
        return "https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1";
    }
}

function getUrlSearch(keyword) {
    return "https://phim.nguonc.com/api/films/search?keyword=" + encodeURIComponent(keyword);
}

function getUrlDetail(slug) {
    return "https://phim.nguonc.com/api/film/" + slug;
}

// =============================================================================
// CORE LOGIC & LINK EXTRACTION (FIXED)
// =============================================================================

/**
 * Hàm giải mã link m3u8 từ URL Embed (StreamC)
 * Dựa trên cơ chế trích xuất từ file .dex của Plugin gốc
 */
function parseDetailResponse(html, url) {
    try {
        var m3u8 = "";
        
        // Bước 1: Nếu URL là dạng embed.php?hash=...
        if (url.indexOf('hash=') > -1) {
            var hash = url.split('hash=')[1].split('&')[0];
            
            // Cơ chế tạo chuỗi Base64: {"h": hash, "t": current_timestamp}
            // Trích xuất từ logic Regex: ^(?!.*embed\.php).*s3.*\.m3u8
            var payload = {
                "h": hash,
                "t": Math.floor(Date.now() / 1000)
            };
            
            var base64Data = btoa(JSON.stringify(payload));
            m3u8 = "https://embed11.streamc.xyz/" + base64Data + ".m3u8";
        } else {
            // Bước 2: Fallback tìm link m3u8 trực tiếp trong script (nếu có)
            var m3u8Regex = /file:\s*["']([^"']+\.m3u8[^"']*)["']|source:\s*["']([^"']+\.m3u8[^"']*)["']|["']([^"']+\.m3u8[^"']*)["']/;
            var match = html.match(m3u8Regex);
            if (match) m3u8 = match[1] || match[2] || match[3];
        }

        if (m3u8) {
            return JSON.stringify({
                url: m3u8,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0",
                    "Referer": "https://embed11.streamc.xyz/",
                    "Origin": "https://embed11.streamc.xyz",
                    "X-Requested-With": "com.anhdaden.nguonc"
                }
            });
        }
        return "{}";
    } catch (error) { return "{}"; }
}

function parseMovieDetail(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var movie = response.movie || response.data?.item || response.data || {};
        var rawEpisodes = movie.episodes || response.episodes || [];

        var servers = [];
        if (Array.isArray(rawEpisodes)) {
            rawEpisodes.forEach(function (server) {
                var episodes = [];
                var serverItems = server.items || server.server_data || [];

                serverItems.forEach(function (ep) {
                    var link = ep.embed || ep.link_embed || ep.m3u8 || ep.link_m3u8 || "";
                    if (link) {
                        episodes.push({
                            id: link,
                            name: ep.name || ep.episode_name || "Tập " + ep.slug,
                            slug: ep.slug || ""
                        });
                    }
                });

                if (episodes.length > 0) {
                    servers.push({
                        name: server.server_name || "Server VIP",
                        episodes: episodes
                    });
                }
            });
        }

        return JSON.stringify({
            id: movie.slug || "",
            title: movie.name || "",
            posterUrl: getImageUrl(movie.thumb_url),
            backdropUrl: getImageUrl(movie.poster_url),
            description: (movie.description || movie.content || "").replace(/<[^>]*>/g, ""),
            year: parseInt(movie.year) || 0,
            quality: movie.quality || "HD",
            servers: servers,
            lang: movie.language || movie.lang || "Vietsub",
            casts: movie.casts || movie.actor || "",
            director: movie.director || "",
            category: movie.category ? "Phim" : "", 
            country: movie.country ? "Quốc tế" : ""
        });
    } catch (error) { return "{}"; }
}

// =============================================================================
// UTILS & PAGINATION
// =============================================================================

function parseListResponse(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var items = response.items || response.data?.items || response.data || [];
        var paginate = response.paginate || response.pagination || {};

        var movies = items.map(function (item) {
            return {
                id: item.slug,
                title: item.name,
                posterUrl: getImageUrl(item.thumb_url),
                year: item.year || 0,
                quality: item.quality || "",
                episode_current: item.current_episode || ""
            };
        });

        return JSON.stringify({
            items: movies,
            pagination: {
                currentPage: paginate.current_page || 1,
                totalPages: paginate.total_page || 1
            }
        });
    } catch (error) { return JSON.stringify({ items: [] }); }
}

function parseSearchResponse(apiResponseJson) { return parseListResponse(apiResponseJson); }

function getImageUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    return "https://img.phimapi.com/" + path;
}

// Helper: Base64 Encoding
function btoa(str) {
    try {
        return Buffer.from(str).toString('base64');
    } catch (e) {
        // Fallback cho môi trường không có Buffer
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var encoded = '';
        for (var i = 0; i < str.length; i += 3) {
            var a = str.charCodeAt(i), b = str.charCodeAt(i + 1), c = str.charCodeAt(i + 2);
            encoded += chars[(a >> 2)] + chars[((a & 3) << 4) | (b >> 4)] + chars[((b & 15) << 2) | (c >> 6)] + chars[c & 63];
        }
        return encoded;
    }
}
