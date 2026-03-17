// =============================================================================
// HELPERS
// =============================================================================

var Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function (e) {
        var t = "";
        var n, r, i, s, o, u, a;
        var f = 0;
        e = Base64._utf8_encode(e);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = (n & 3) << 4 | r >> 4;
            u = (r & 15) << 2 | i >> 6;
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64
            } else if (isNaN(i)) {
                a = 64
            }
            t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)
        }
        return t
    },
    decode: function (e) {
        var t = "";
        var n, r, i;
        var s, o, u, a;
        var f = 0;
        e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (f < e.length) {
            s = this._keyStr.indexOf(e.charAt(f++));
            o = this._keyStr.indexOf(e.charAt(f++));
            u = this._keyStr.indexOf(e.charAt(f++));
            a = this._keyStr.indexOf(e.charAt(f++));
            n = s << 2 | o >> 4;
            r = (o & 15) << 4 | u >> 2;
            i = (u & 3) << 6 | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r)
            }
            if (a != 64) {
                t = t + String.fromCharCode(i)
            }
        }
        t = Base64._utf8_decode(t);
        return t
    },
    _utf8_encode: function (e) {
        e = e.replace(/\r\n/g, "\n");
        var t = "";
        for (var n = 0; n < e.length; n++) {
            var r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r)
            } else if (r > 127 && r < 2048) {
                t += String.fromCharCode(r >> 6 | 192);
                t += String.fromCharCode(r & 63 | 128)
            } else {
                t += String.fromCharCode(r >> 12 | 224);
                t += String.fromCharCode(r >> 6 & 63 | 128);
                t += String.fromCharCode(r & 63 | 128)
            }
        }
        return t
    },
    _utf8_decode: function (e) {
        var t = "";
        var n = 0;
        var r = 0, c2 = 0, c3 = 0;
        while (n < e.length) {
            r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++
            } else if (r > 191 && r < 224) {
                c2 = e.charCodeAt(n + 1);
                t += String.fromCharCode((r & 31) << 6 | c2 & 63);
                n += 2
            } else {
                c2 = e.charCodeAt(n + 1);
                c3 = e.charCodeAt(n + 2);
                t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                n += 3
            }
        }
        return t
    }
}

// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "thapcam",
        "name": "Thập Cẩm",
        "version": "1.0.1",
        "baseUrl": "https://pub-26bab83910ab4b5781549d12d2f0ef6f.r2.dev",
        "iconUrl": "https://tctv.pro/10cam-logo-app-light.jpg",
        "isEnabled": true,
        "type": "VIDEO"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'live', title: '🔴 Live', type: 'Horizontal', path: 'thapcam.json' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Trực tiếp', slug: 'live' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({});
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    return "https://pub-26bab83910ab4b5781549d12d2f0ef6f.r2.dev/thapcam.json";
}

function getUrlSearch(keyword, filtersJson) {
    return "https://pub-26bab83910ab4b5781549d12d2f0ef6f.r2.dev/thapcam.json";
}

function getUrlDetail(slug) {
    // Slug ở đây là chuỗi Base64 chứa thông tin trận đấu
    // Chúng ta sử dụng httpbin.org để echo lại dữ liệu này vì App không truyền slug vào parseMovieDetail
    return "https://httpbin.org/anything/thapcam/" + slug;
}

// =============================================================================
// PARSERS
// =============================================================================

function parseListResponse(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var groups = response.groups || [];
        var allItems = [];

        groups.forEach(function (group) {
            var channels = group.channels || [];
            channels.forEach(function (channel) {
                // Đóng gói thông tin quan trọng vào ID để "smuggle" sang trang detail
                var info = {
                    id: channel.id,
                    name: channel.name,
                    img: channel.image ? channel.image.url : "",
                    meta: channel.org_metadata || {},
                    srcs: channel.sources || []
                };
                var encodedId = Base64.encode(JSON.stringify(info));

                allItems.push({
                    id: encodedId,
                    title: channel.name,
                    posterUrl: channel.image ? channel.image.url : "",
                    backdropUrl: channel.image ? channel.image.url : "",
                    year: 0,
                    quality: "LIVE",
                    episode_current: channel.labels && channel.labels.length > 0 ? channel.labels[0].text : "Live",
                    lang: channel.org_metadata ? channel.org_metadata.league : ""
                });
            });
        });

        return JSON.stringify({
            items: allItems,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: allItems.length,
                itemsPerPage: 100
            }
        });
    } catch (error) {
        return JSON.stringify({ items: [], pagination: { currentPage: 1, totalPages: 1 } });
    }
}

function parseSearchResponse(apiResponseJson) {
    return parseListResponse(apiResponseJson);
}

function parseMovieDetail(apiResponseJson, slug) {
    try {
        var data;
        // Kiểm tra xem apiResponseJson có phải là kết quả từ httpbin không
        if (apiResponseJson.indexOf("httpbin.org/anything/thapcam/") !== -1) {
            var bridgeData = JSON.parse(apiResponseJson);
            var url = bridgeData.url;
            var parts = url.split("/thapcam/");
            var base64Data = parts[parts.length - 1];
            data = JSON.parse(Base64.decode(base64Data));
        } else {
            // Dự phòng nếu app truyền slug trực tiếp (Trường hợp user đã sửa app sau này)
            if (slug && slug.length > 50) {
                data = JSON.parse(Base64.decode(slug));
            } else {
                return "null";
            }
        }

        if (!data) return "null";

        var servers = [];
        var sources = data.srcs || [];
        sources.forEach(function (source) {
            var episodes = [];
            var contents = source.contents || [];
            contents.forEach(function (content) {
                var streams = content.streams || [];
                streams.forEach(function (stream) {
                    var links = stream.stream_links || [];
                    links.forEach(function (link) {
                        // Tiếp tục "smuggle" link detail vào ID của tập phim
                        var streamData = {
                            url: link.url,
                            headers: link.request_headers || []
                        };
                        episodes.push({
                            id: Base64.encode(JSON.stringify(streamData)),
                            name: (source.name || "Server") + " - " + (link.name || "Link"),
                            slug: link.id || "stream"
                        });
                    });
                });
            });
            if (episodes.length > 0) {
                servers.push({ name: source.name || "Live Source", episodes: episodes });
            }
        });

        var metadata = data.meta || {};
        var description = "Trận đấu giữa " + (metadata.team_a || "Đội A") + " và " + (metadata.team_b || "Đội B");
        if (metadata.league) description += " tại giải " + metadata.league;

        return JSON.stringify({
            id: data.id,
            title: data.name,
            originName: metadata.league || "",
            posterUrl: data.img,
            backdropUrl: data.img,
            description: description,
            year: 0,
            rating: 0,
            quality: "LIVE",
            servers: servers,
            episode_current: "Live",
            lang: "Việt",
            category: "Bóng đá trực tiếp",
            country: "Việt",
            director: "Thập Cẩm TV",
            casts: (metadata.team_a || "") + ", " + (metadata.team_b || "")
        });
    } catch (error) { 
        return "null"; 
    }
}

function parseDetailResponse(apiResponseJson, slug) {
    try {
        // Slug ở đây là dữ liệu stream đã được mã hóa Base64 từ parseMovieDetail
        var decoded = Base64.decode(slug);
        var streamInfo = JSON.parse(decoded);
        var headers = {};
        
        if (streamInfo.headers) {
            streamInfo.headers.forEach(function (h) {
                headers[h.key] = h.value;
            });
        }

        // Đảm bảo có User-Agent mặc định nếu không có trong headers
        if (!headers["User-Agent"]) headers["User-Agent"] = "Mozilla/5.0";

        return JSON.stringify({
            url: streamInfo.url,
            headers: headers,
            subtitles: []
        });
    } catch (error) {
        // Fallback nếu có lỗi hoặc slug là URL trực tiếp
        return JSON.stringify({
            url: slug,
            headers: { "User-Agent": "Mozilla/5.0" },
            subtitles: []
        });
    }
}

function parseCategoriesResponse(apiResponseJson) {
    return JSON.stringify([{ name: 'Trực tiếp', slug: 'live' }]);
}

function parseCountriesResponse(apiResponseJson) { return "[]"; }
function parseYearsResponse(apiResponseJson) { return "[]"; }
