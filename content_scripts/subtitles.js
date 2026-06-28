
var subtitle_file = null;
var selected_video_element = null;

var subtitle_time_offset = 0;
var subtitle_position_offset = -100;
var subtitle_font = "Arial";
var subtitle_font_size = 50;
var subtitle_font_color = "rgba(255, 255, 255, 1)";
var subtitle_background_color = "rgba(0, 0, 0, 0.7)";

var subtitle_element = null;
var subtitles = [];
var active_subtitle_index = -1;

function ResetSubtitles() {
    // Remove the subtitles by resetting all values.
    StopPlayingSubtitles();
    subtitles = [];
    active_subtitle_index = -1;
    subtitle_element.innerHTML = "";

    browser.runtime.sendMessage({
        type: "selectedVideoChanged",
        video_src: "",
    });
}

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "getVideoInfo") {
      const videos = [...document.querySelectorAll("video")];
  
      return Promise.resolve({
        videos: videos.map(v => ({
          src: v.currentSrc,
          selected: selected_video_element === v,
        }))
      });
    }

    if (message.action === "addSubtitles") {
        var video_element_src = message.video_element_src;
        var video_elements = document.getElementsByTagName("video");

        for (var index = 0; index < video_elements.length; index++) {
            if (video_elements[index].currentSrc == video_element_src) {
                ResetSubtitles();

                if (selected_video_element != video_elements[index]) {
                    selected_video_element = video_elements[index];
                    ShowSubtitles(true);

                    browser.runtime.sendMessage({
                        type: "selectedVideoChanged",
                        video_src: video_element_src,
                    });
                }
                else {
                    selected_video_element = null;
                }

                break;
            }
        }
    }

    if (message.action === "getSubtitlesInput") {
        return Promise.resolve({
            file : subtitle_file
        });
    }

    if (message.action === "updateSettings") {
        subtitle_time_offset = message.subtitle_time_offset;
        subtitle_position_offset = message.subtitle_position_offset;
        subtitle_font = message.subtitle_font;
        subtitle_font_size = message.subtitle_font_size;
        subtitle_font_color = message.subtitle_font_color;
        subtitle_background_color = message.subtitle_background_color;

        ShowSubtitles(true);
    }
});

 function ParseTime(time_text) {
    var split = time_text.split(":");
    var hours = split[0] * 60 * 60;
    var minutes = split[1] * 60;
    var seconds = parseFloat(time_text.split(":")[2].replace(",", "."));
    return hours + minutes + seconds;
}

 function ParseSubtitles(text) {
    subtitles.length = 0;
    text = text.replace(/\r/g, "");
    text = text.split("\n\n");

    for (var i = 0; i < text.length; i++) {
        s = text[i].split("\n");

        if (s.length <= 1) {
            continue;
        }

        var pos = s[0].indexOf(" --> ") > 0 ? 0 : (s[1].indexOf(" --> ") > 0 ? 1 : -1);

        if(pos <= -1) {
            continue;
        }

        time = s[pos].split(" --> ");
        line_text = [];
        for (var j = pos + 1; j < s.length; j++) {
            line_text.push(s[j]);
        }
        subtitles.push({begin: ParseTime(time[0]), end: ParseTime(time[1]), text: line_text});
    }
}

function GetSubtitleCSS() {
    return "font-family: " + subtitle_font +
            ";font-size: " + subtitle_font_size +
            "px;color:" + subtitle_font_color +
            ";background-color:" + subtitle_background_color + ";";
}

function XSS(input) {
    input = input.replace(/\&/g, "&amp;");
    input = input.replace(/\</g, "&lt;");
    input = input.replace(/\>/g, "&gt;");
    input = input.replace(/\"/g, "&quot;");
    input = input.replace(/\'/g, "&#x27;");
    input = input.replace(/\//g, "&#x2F;");
    return input;
}

function AllowTags(input) {
    var allowed_html_tags = ["b", "i", "u", "br"];
    for(var i = 0; i < allowed_html_tags.length; i++){
        var regex = new RegExp("&lt;"+allowed_html_tags[i]+"&gt;", "g");
        input = input.replace(regex, "<"+allowed_html_tags[i]+">");
        regex = new RegExp("&lt;&#x2F;"+allowed_html_tags[i]+"&gt;", "g");
        input = input.replace(regex, "</"+allowed_html_tags[i]+">");
    }
    return input;
}

function ShowSubtitles(force_update = false) {
    if (subtitle_element == null)
    {
        // Create the main subtitle element that will show the subtitles to the user.
        subtitle_element = document.createElement("div");
        subtitle_element.id = "subtitle_element";
        document.body.append(subtitle_element);

        style = document.createElement("style");
        style.textContent = `
        #subtitle_element{
            text-align: center;
        }
        .subtitle_line{
            display: inline-block;
            text-align: center;
            z-index: 99999;
        }`;
        document.getElementsByTagName("head")[0].appendChild(style);
    }
    else if (force_update === true) {
        subtitle_element.innerHTML = "";
    }

    if (selected_video_element) {
        if (subtitles.length > 0) { // Do we have subtitles to display? 
            // Find the active subtitles based on the video element's time stamp.
            var time = selected_video_element.currentTime;
            var subtitle_index = -1;
            var found_any = false;
            for (var index = 0; index < subtitles.length; index++) {
                if (subtitles[index].begin + subtitle_time_offset <= time && subtitles[index].end + subtitle_time_offset >= time) {
                    subtitle_index = index;
                    found_any = true;
                    break;
                }
            }

            if (subtitle_index != active_subtitle_index || !found_any || force_update === true) {
                active_subtitle_index = subtitle_index;
                
                if (!found_any) {
                    subtitle_element.textContent = "";
                }
                else {
                    subtitle_element.innerHTML = "";
                    for(var i = 0; i < subtitles[subtitle_index].text.length; i++){
                        var subtitle_line = document.createElement("div");
                        subtitle_line.innerHTML = AllowTags(XSS(subtitles[subtitle_index].text[i]));
                        subtitle_line.className = "subtitle_line";
                        subtitle_line.style.cssText = GetSubtitleCSS();
                        subtitle_element.appendChild(subtitle_line);
                        subtitle_element.appendChild(document.createElement("br"));
                    }
                }
            }
        }
        else { // No subtitles, ask the user to supply a file
            var subtitle_line = document.createElement("input");
            subtitle_line.type = "file";
            subtitle_line.accept = ".srt,.vtt"
            subtitle_line.className = "subtitle_line";
            subtitle_line.textContent = "Upload";
            subtitle_line.style.cssText = GetSubtitleCSS();
            subtitle_line.addEventListener("change", () => {
                const file = subtitle_line.files[0];
                if (file) {
                    subtitle_file = file;
                    var file_reader = new FileReader();

                    file_reader.onload = function(event) {
                        ParseSubtitles(event.target.result);
                        StartPlayingSubtitles();
                    }

                    file_reader.readAsText(subtitle_file);
                }
            });

            subtitle_element.appendChild(subtitle_line);
            subtitle_element.appendChild(document.createElement("br"));
        }

        PositionSubtitles();
    }
}

function PositionSubtitles() {
    if (!selected_video_element) {
        return;
    }

    var subtitle_height = subtitle_element.getBoundingClientRect().height;
    var selected_video_element_height = selected_video_element.offsetHeight;
    var selected_video_element_top = GetOffset(selected_video_element)[0];

    var sub_pos_top = selected_video_element_height + selected_video_element_top + subtitle_position_offset - subtitle_height;
    var sub_pos_left = GetOffset(selected_video_element)[1];

    subtitle_element.style.position = "absolute";
    subtitle_element.style.width = selected_video_element.offsetWidth + "px";
    subtitle_element.style.top = sub_pos_top + "px";
    subtitle_element.style.left = sub_pos_left + "px";
}

function GetOffset(element) {
    var top = 0;
    var left = 0;
    while(element) {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    }
    return [top, left];
}

var interval_handle = 0;

function StartPlayingSubtitles() {   
    interval_handle = setInterval(function() {
        if (subtitles.length == 0 || selected_video_element == null) {
            ResetSubtitles();
        }

        ShowSubtitles();
    }, 100);
}

function StopPlayingSubtitles() {
    clearInterval(interval_handle);
}