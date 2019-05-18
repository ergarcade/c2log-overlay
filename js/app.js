/*
 */

/*
 * Concept2 oneline log format:
 * Column 0: Number
 * Column 1: Time (seconds)
 * Column 2: Distance (metres)
 * Column 3: Pace (seconds)
 * Column 4: Watts
 * Column 5: Cal/Hr
 * Column 6: Stroke Rate
 * Column 7: Heart Rate
 */
const C2_NUMBER             = 0;
const C2_TIME               = 1;
const C2_DISTANCE           = 2;
const C2_PACE               = 3;
const C2_WATTS              = 4;
const C2_CAL_PER_HOUR       = 5;
const C2_STROKE_RATE        = 6;
const C2_HEART_RATE         = 7;
const C2_MAX_COLS           = C2_HEART_RATE;

/*
 * The .csv from Concept2 doesn't provide us with
 * time between intervals. In order to preserve
 * the frame, use some arbitrary pause, and allow
 * the end user to decide how to handle transitions
 * between intervals (most likely some manual thing).
 */
const INTERVAL_GAP = 5;    /* seconds between "intervals" */

/*
 * Output movie dimensions.
 */
const MOVIE_WIDTH = 220;
const MOVIE_HEIGHT = 180;

var video;              /* the current video */
var interval = 1;       /* current interval */
var data = null;        /* csv data as parsed by Papa.parse in parseFile() */
var line = 1;           /* current line we're writing */
var hold_time = 0;      /* time to hold current line */

/*
 * Get requestAnimationFrame().
 */
(function() {
  var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

/*
 */
function setStatus(msg) {
    $('#status p').html(msg);
}

/*
 */
function clearMovies() {
    $("#movies").empty();
}

function printable_time(t) {
    return moment.utc(t*1000).format("HH:mm:ss");
}
function printable_distance(d) {
    return (Math.trunc(d)).toLocaleString();
}
function printable_pace(p) {
    return moment.utc(p*1000).format("m:ss.S");
}
function printable_watts(w) {
    return w;
}
function printable_cals_per_hour(cph) {
    return cph.toLocaleString();
}
function printable_stroke_rate(sr) {
    return sr;
}
function printable_heart_rate(hr) {
    return hr;
}

function writeFrame(index, hold_time, _data) {
    var d = {};

    setStatus('Writing frame ' + line);

    if (!_data) {
        _data = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
    } else {
        /*
         * C2 .csv files have nulls in some places; sanitise.
         */
        for (var i = 0; i < C2_MAX_COLS; i++) {
            if (!_data[i]) {
                _data[i] = 0;
            }
        }
    }

    /*
     * Convert to printables.
     */
    d.time          = printable_time(_data[C2_TIME]);
    d.distance      = printable_distance(_data[C2_DISTANCE]);
    d.pace          = printable_pace(_data[C2_PACE]);
    d.watts         = printable_watts(_data[C2_WATTS]);
    d.cals_per_hour = printable_cals_per_hour(_data[C2_CAL_PER_HOUR]);
    d.stroke_rate   = printable_stroke_rate(_data[C2_STROKE_RATE]);
    d.heart_rate    = printable_heart_rate(_data[C2_HEART_RATE]);

    /*
     * Write to canvas.
     * XXX Pull this out; efficiency.
     */
    var canvas = document.getElementById("movie-" + index);
    if (canvas.getContext) {
        var ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.clearRect(0, 0, MOVIE_WIDTH, MOVIE_HEIGHT);
            ctx.font = 'bold 24px arial';

            ctx.fillText(d.time,                10, 25);
            ctx.fillText(d.stroke_rate + 's/m', 140, 25);

            ctx.font = 'bold 64px arial';
            ctx.fillText(d.pace,                10, 80);

            ctx.font = 'bold 24px arial';
            ctx.fillText(d.distance + 'm',      10, 110);
            ctx.fillText(d.heart_rate + String.fromCharCode(0x2764), 140, 110);

            ctx.fillText(d.watts + ' watts', 10, 140);
            ctx.fillText(d.cals_per_hour + ' cals/hr',   10, 170);

            video.add(ctx, hold_time * 1000);
        }
    }
}

function startMovie(idx) {
    setStatus('Starting interval ' + idx);

    $("#movies").append('<canvas id="movie-' + idx + '" ' +
        ' width="' + MOVIE_WIDTH + '"' +
        ' height="' + MOVIE_HEIGHT + '"></canvas>');
    $("#movies").append('<video id="video-' + idx + '" ' +
        ' width="' + MOVIE_WIDTH + '"' +
        ' height="' + MOVIE_HEIGHT + '" controls autoplay loop></video>');

    $("#movies").append('<a class="download" id="download-video-' + idx + '"' +
        'href="movie-' + idx + '.webm">Download</a><br />');

    video = new Whammy.Video();
}

function endMovie() {
    setStatus('Compiling movie');

    video.compile(false, function(output) {
        var url = webkitURL.createObjectURL(output);

        document.getElementById('video-' + interval).src = url;
        document.getElementById('download-video-' + interval).href = url;

        setStatus('Movie compilation complete.');
    });
}

function finishVideos() {
    setStatus("Movie generation complete.");
}

function generateFrame() {
    if (line == 1) {
        startMovie(interval);

        writeFrame(interval, data.data[1][C2_TIME]);
        line++;

        requestAnimationFrame(generateFrame);

    } else if (line == data.data.length-2) {
        /*
         * If we're on the last line, we can't get any more
         * frames. End with same arbitrary hold time as per
         * interval gap.
         */
        hold_time = INTERVAL_GAP;
        writeFrame(interval, hold_time, data.data[line]);
        /*
        endMovie();
        requestAnimationFrame(finishVideos);
        */
        requestAnimationFrame(endMovie);

    } else if (data.data[line+1][C2_TIME] < data.data[line][C2_TIME]) {
        /*
         * This is the end of an interval.
         */

        hold_time = INTERVAL_GAP;
        writeFrame(interval, hold_time, data.data[line]);
        line++;

        endMovie();
        interval++;
        startMovie(interval);

        if (line+1 < data.data.length-2) {
            /*
             * Start next interval with zero frame.
             */
            writeFrame(interval, hold_time);
            requestAnimationFrame(generateFrame);
        }
    } else {
        hold_time = data.data[line+1][C2_TIME] - data.data[line][C2_TIME];
        writeFrame(interval, hold_time, data.data[line]);
        line++;

        requestAnimationFrame(generateFrame);
    }
}

/*
 */
function parseFile(file) {
    setStatus('Parsing...');

    Papa.parse(file, {
        dynamicTyping: true,

        complete: function(results) {
            if (results.errors.length) {
                setStatus('<strong>Errors in input file; check console.</strong>');
                console.log(results.errors);
                return;
            }

            /*
             * Setup state.
             */
            interval = 1;
            data = results;
            line = 1;
            hold_time = 0;

            generateFrame();
        }
    });
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
}

function handleDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    clearMovies();
    parseFile(evt.dataTransfer.files[0]);
}

$(document).ready(function() {
    var dropzone = document.getElementById('dropzone');

    dropzone.addEventListener('dragover', handleDragOver, false);
    dropzone.addEventListener('drop', handleDrop, false);

    setStatus('Ready.');
});
