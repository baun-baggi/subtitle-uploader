var default_settings = {
    subtitle_time_offset: 0,
    subtitle_position_offset: -100,
    subtitle_font_size: 50,
    subtitle_font: "Arial",
    subtitle_font_color: "rgba(255, 255, 255, 1)",
    subtitle_background_color: "rgba(0, 0, 0, 0.65)",
};

// Create the color pickers.
var picker_layout = [
    {
        component: iro.ui.Wheel,
    },
    {
        component: iro.ui.Slider,
        options: { sliderType: "value" },
    },
    {
        component: iro.ui.Slider,
        options: { sliderType: "alpha" },
    },
];

var font_color_picker = new iro.ColorPicker('#font_color_picker', {
    width: 100,
    color: default_settings.subtitle_font_color,
    layoutDirection: "horizontal",
    layout: picker_layout,
});
var background_color_picker = new iro.ColorPicker('#background_color_picker', {
    width: 100,
    color: default_settings.subtitle_background_color,
    layoutDirection: "horizontal",
    layout: picker_layout,
});

// Load settings from storage
chrome.storage.sync.get(default_settings, function (storage) {
    document.getElementById("subtitle_time_offset_input").value = storage.subtitle_time_offset;
    document.getElementById("subtitle_position_offset_input").value = storage.subtitle_position_offset;
    document.getElementById("subtitle_font_size_input").value = storage.subtitle_font_size;
    document.getElementById("subtitle_font_input").value = storage.subtitle_font;
    font_color_picker.color.rgbaString = storage.subtitle_font_color;
    background_color_picker.color.rgbaString = storage.subtitle_background_color;

    OnUpdateSettings(false);
});

async function OnUpdateSettings(save_settings = true) {
    if (save_settings) {
        chrome.storage.sync.remove([
            "subtitle_time_offset",
            "subtitle_position_offset",
            "subtitle_font_size",
            "subtitle_font",
            "subtitle_font_color",
            "subtitle_background_color",
        ]);
        
        chrome.storage.sync.set({
            subtitle_time_offset: parseFloat(document.getElementById("subtitle_time_offset_input").value),
            subtitle_position_offset: parseFloat(document.getElementById("subtitle_position_offset_input").value),
            subtitle_font_size: document.getElementById("subtitle_font_size_input").value,
            subtitle_font: document.getElementById("subtitle_font_input").value,
            subtitle_font_color: font_color_picker.color.rgbaString,
            subtitle_background_color: background_color_picker.color.rgbaString,
        });
    }
        
    const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true
    });
    
    browser.tabs.sendMessage(tab.id, {
        action : "updateSettings",
        subtitle_time_offset: parseFloat(document.getElementById("subtitle_time_offset_input").value),
        subtitle_position_offset: parseFloat(document.getElementById("subtitle_position_offset_input").value),
        subtitle_font: document.getElementById("subtitle_font_input").value,
        subtitle_font_size: document.getElementById("subtitle_font_size_input").value,
        subtitle_font_color: font_color_picker.color.rgbaString,
        subtitle_background_color: background_color_picker.color.rgbaString,
    });
}

document.getElementById("subtitle_time_offset_input").addEventListener("input", function(){
    OnUpdateSettings();
});

document.getElementById("subtitle_position_offset_input").addEventListener("input", function(){
    OnUpdateSettings();
});

document.getElementById("subtitle_font_size_input").addEventListener("input", function(){
    OnUpdateSettings();
});

document.getElementById("subtitle_font_input").addEventListener("input", function(){
    OnUpdateSettings();
});

font_color_picker.on('color:change', function() {
    OnUpdateSettings();
});

background_color_picker.on('color:change', function() {
    OnUpdateSettings();
});

async function UpdateVideoElementsList() {
    var video_elements_list = document.getElementById("video_elements_list");
    video_elements_list.innerHTML = "<div id=\"loading_videos\">Finding video players...</div>";
     
    const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true
    });

    const response = await browser.tabs.sendMessage(tab.id, {
        action: "getVideoInfo"
    });

    if (response.videos.length == 0) {
        video_elements_list.innerHTML = `<div id=\"no_videos\">No video players found.</div>`;
        return;
    }

    video_elements_list.innerHTML = "";
    for (const video of response.videos) {
        var video_list_item = document.createElement("div");
        video_list_item.className = "video_list_item";
        video_list_item.textContent = video.src;
        video_list_item.video_src_string = video.src;

        if (video.selected) {
            video_list_item.classList.add("selected_video")
        }

        (function(){
            video_list_item.addEventListener("mouseenter", function(){
                if (!this.classList.contains("selected_video")) {
                    this.classList.add("hovered_video");
                }
            });
            video_list_item.addEventListener("mouseleave", function(){
                this.classList.remove("hovered_video");
            });
            video_list_item.addEventListener("click", function() {
                browser.tabs.sendMessage(tab.id, { 
                    action: "addSubtitles",
                    video_element_src: video_list_item.textContent
                });               
            });
        }());

        video_elements_list.append(video_list_item);
    }

    browser.runtime.onMessage.addListener((message) => {
        if (message.type === "selectedVideoChanged") {
            console.log(message.video_src);
            for (video_list_item of document.getElementsByClassName("video_list_item")) {
                if (video_list_item.video_src_string == message.video_src) {
                    console.log("added");
                    video_list_item.classList.add("selected_video");
                    video_list_item.classList.remove("hovered_video");
                }
                else {
                    console.log("removed");
                    console.log(video_list_item.video_src_string);
                    video_list_item.classList.remove("selected_video");
                }
            }
        }
    });
}

UpdateVideoElementsList();