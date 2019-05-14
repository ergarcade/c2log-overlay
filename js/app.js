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

/*
 * The .csv from Concept2 doesn't provide us with
 * time between intervals. In order to preserve
 * the frame, use some arbitrary pause, and allow
 * the end user to decide how to handle transitions
 * between intervals (most likely some manual thing).
 */
const INTERVAL_GAP = 5;    /* seconds between "intervals" */

/*
 */
function setStatus(msg) {
    $('#status p').html(msg);
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

            for (var i = 1; i < results.data.length-1; i++) { /* line 0 is header; ignore */
                var hold_time;

                if (i == results.data.length-2) {
                    /*
                     * If we're on the last line, we can't get any more
                     * lines. End with same arbitrary hold time as per
                     * interval gap.
                     */
                    hold_time = INTERVAL_GAP;

                    /* XXX write final frame */
                    console.log('write final frame with hold_time ' + hold_time);

                    /* XXX close this file */
                    console.log('end file with line ' + i);
                    break;
                } else if (results.data[i+1][C2_TIME] < results.data[i][C2_TIME]) {
                    /*
                     * This is the end of an interval.
                     */

                    /* XXX construct frame */
                    hold_time = INTERVAL_GAP;

                    /* XXX write frame with hold time of hold_time */
                    console.log('write frame ' + i + ' with hold_time ' + hold_time);

                    /* XXX close this file */
                    console.log('end file with line ' + i);

                    /* XXX open new file */

                } else {
                    hold_time = results.data[i+1][C2_TIME] - results.data[i][C2_TIME];

                    console.log('write frame ' + i + ' with hold_time ' + hold_time);

                    /* XXX write frame with hold time of hold_time */
                }
            }

            setStatus('<strong>Parse complete.</strong>');
/*
            console.log(results);
            console.log(results.data.length-1);
            */
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

    console.log(evt.dataTransfer.files[0].name);
    parseFile(evt.dataTransfer.files[0]);
}

$(document).ready(function() {
    var dropzone = document.getElementById('dropzone');

    dropzone.addEventListener('dragover', handleDragOver, false);
    dropzone.addEventListener('drop', handleDrop, false);

    setStatus('Ready.');
});
