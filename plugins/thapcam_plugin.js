// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "thapcam",
        "name": "Thập Cẩm",
        "version": "1.0.0",
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
    // Slug ở đây sẽ là ID của trận đấu
    return "https://pub-26bab83910ab4b5781549d12d2f0ef6f.r2.dev/thapcam.json";
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
                allItems.push({
                    id: channel.id,
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
        var response = JSON.parse(apiResponseJson);
        var groups = response.groups || [];
        var targetChannel = null;

        for (var i = 0; i < groups.length; i++) {
            var channels = groups[i].channels || [];
            for (var j = 0; j < channels.length; j++) {
                if (channels[j].id === slug) {
                    targetChannel = channels[j];
                    break;
                }
            }
            if (targetChannel) break;
        }

        if (!targetChannel) return "null";

        var servers = [];
        var sources = targetChannel.sources || [];
        sources.forEach(function (source) {
            var episodes = [];
            var contents = source.contents || [];
            contents.forEach(function (content) {
                var streams = content.streams || [];
                streams.forEach(function (stream) {
                    var links = stream.stream_links || [];
                    links.forEach(function (link) {
                        episodes.push({
                            id: JSON.stringify({ url: link.url, headers: link.request_headers }),
                            name: source.name + " - " + link.name,
                            slug: link.id
                        });
                    });
                });
            });
            if (episodes.length > 0) {
                servers.push({ name: source.name, episodes: episodes });
            }
        });

        var metadata = targetChannel.org_metadata || {};
        var description = "Trận đấu giữa " + (metadata.team_a || "Đội A") + " và " + (metadata.team_b || "Đội B");
        if (metadata.league) description += " tại giải " + metadata.league;

        return JSON.stringify({
            id: targetChannel.id,
            title: targetChannel.name,
            originName: metadata.league || "",
            posterUrl: targetChannel.image ? targetChannel.image.url : "",
            backdropUrl: targetChannel.image ? targetChannel.image.url : "",
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
    } catch (error) { return "null"; }
}

function parseDetailResponse(apiResponseJson, slug) {
    try {
        // Trong trường hợp này, 'slug' thực chất là ID mà App sẽ gửi lại khi user chọn tập phim
        // Nhưng ở parseMovieDetail tôi đã nhét JSON string vào ID của tập phim
        // Nên App sẽ gửi cái string đó về đây.

        var streamInfo = JSON.parse(slug);
        var headers = {};
        if (streamInfo.headers) {
            streamInfo.headers.forEach(function (h) {
                headers[h.key] = h.value;
            });
        }

        return JSON.stringify({
            url: streamInfo.url,
            headers: headers,
            subtitles: []
        });
    } catch (error) {
        // Fallback nếu slug không phải JSON (có thể là ID thô)
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
