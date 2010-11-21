(function($) {
$.fn.fastnotes = function(options) {
    var JNotes = $(this);
    JNotes.addClass("fnnotes");
    JNotes.append("<input type='text' class='fninput' /> &nbsp; "
    		+ "<img id='help_button' style='cursor:pointer' title='Show help' src='/images/help_icon.gif' /><br />"
            + "<a class='fnbutton_today'>Today</a>&nbsp;"
            + "<a class='fnbutton_month'>Month</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
            + "<div class='fnlist'></div>"
    );
    var JInput = $('.fninput', JNotes);
    var JList = $('.fnlist', JNotes);
    
    /******************************** Bind Live Events to JList **************************************/
    // For row updating
    $(".fnrow", JList).live("dblclick", function() {
        var jrow = $(this);
        var note_text = jrow.text();
        var note_id   = jrow.attr('id');
        
        $("<input type='text' class='fnrowinput' value='" + note_text +"'/>").insertAfter(jrow).keypress( function(e){
            if (e.keyCode != 13) return;
            
            // Update note                
            var jinput = $(this);
            var text = jinput.val();
            $.Update('/notes/' + note_id, {text: text} , function (saved_note) {
                if ( saved_note ) {
                    jrow.text(saved_note.text);
                    update_cache('update', saved_note.note_id, saved_note)
                    
                    jinput.remove();
                    jrow.show();
                } else {
                    alert ("Error adding note!");
                }
            });
        });
        
        jrow.hide();
    });
    
    
    // For row deletion
    $(".delete_button", JList).live("click", function(e){
        var note_id = $(this).siblings("span:first").attr("id");
        delete_note(note_id);
    });
    
    // Checkbox saving
    var set_checkbox_timeout = {};
    $("input:checkbox", JList).live("click", function(e){
        var note_id = $(this).siblings("span:first").attr("id");
        var is_checked = $(this).attr('checked') ? 1 : 0;
        
        window.clearTimeout(set_checkbox_timeout["note_id" + note_id]);
        set_checkbox_timeout["note_id" + note_id] = window.setTimeout( function() { set_note_checkbox(note_id, is_checked)} , 1000);
    });
    /************************************************************************************************/
    
    var NOTES = [];

    $.Read('/notes', function(data) {

        NOTES  = data;
        redraw_notes_list(NOTES);
    });

    function show_notes_window() {
        JNotes.dialog( {
            draggable : true,
            resizable : false,
            title : 'Simple Notes',
            show: 'drop',
            height : 600,
            width : 800
        });

        $('.fnbutton_today', JNotes).button().click(function() {
            JInput.val('/'+ get_date_string() + '*');
            process_input();
        });

        $('.fnbutton_month', JNotes).button().click(function() {
            JInput.val('/'+ get_date_string().substr(0, 7) + '*');
            process_input();
        });
        
        $('#help_button', JNotes).click(function() {
             window.open('/help')
        });
        
        
        
        JInput.keypress(function(e){
            if (e.keyCode != 13) return;
            process_input();
        });
    }

    show_notes_window();

    options = jQuery.extend( {}, options);

    function process_input() {
        var note_text = JInput.val();
        
        if (! note_text.length || note_text.match(/^\s*\//)){
            search_notes(note_text.replace(/^\s*\//, ""));
        }else{
            JInput.val('');
            var is_important = 0, is_todo = 0;
            
            // Process flags
            var flags_raw = note_text.match(/^([\s!:]+)/) 
            if ( flags_raw ) {
                note_text = note_text.replace(/^[\s!:]*/, "");
                var flags =   flags_raw[1].split('');

                for (var i = 0; i < flags.length; i++ ) {
                    if (flags[i] == '!' ) {
                        is_important = 1;        
                    } else if (flags[i] == ':') {
                        is_todo = 1;
                    } 
                }    
            }

            add_new_note(note_text, is_important, is_todo);
            
        }
    }
    
    function add_new_note(note_text, is_important, is_todo) {
        var note = {
                'text': get_datetime_string() + " " + note_text,
                'is_important': is_important,
                'is_todo': is_todo,
        };

        
        $.Create('/notes', note, function (saved_note) {
            if ( saved_note ) {
                NOTES.unshift(saved_note);
                redraw_notes_list(NOTES);
            } else {
                alert ("Error adding note!");
            }
        });
    }
    
    function search_notes(search_text){
        // quote special characters
        search_text = search_text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

        // find wildcards
        var search_re = search_text.replace(/\\\*/, '.*');

        var found_notes = [];
        for (var i = 0; i< NOTES.length; i++) {
            if (NOTES[i].text.match(search_re)) {
                found_notes.push(NOTES[i]);
            }
        }
        
        redraw_notes_list(found_notes);
    }
    
    function redraw_notes_list(notes){
        JList.empty();
        for (var i = 0; i< notes.length; i++) {
            var row_string =  "";
            if (notes[i].is_todo) {
                row_string = "<input type='checkbox'";
                if ( notes[i].is_todo == 2 ) row_string += "checked='checked'";
                row_string += "/>"
            }else{
                row_string = "<input type='checkbox' style='visibility:hidden'/>";
            }
            row_string +="<span id='"+ notes[i].note_id +"' class='fnrow ";
            if (notes[i].is_important) row_string += "fnimportant"; 
            row_string += "'>" + html_escape(notes[i].text) + "</span>  ";

            var delete_button_string = "&nbsp; <img class='delete_button' src='/images/delete_button.gif' />"
                
            JList.append('<div>' + row_string+delete_button_string+ '</div>');
            
        }
    }
    
    function delete_note(note_id) {
        if (! note_id) return; 
        $.Delete('/notes/' + note_id, function (status) {
            if (status) {
                $('#' + note_id).parent("div").remove();
                update_cache('delete', note_id)
            }
        });
    }
    
    
    function set_note_checkbox(note_id, is_checked) {
        if (! note_id) return;
        
        var is_todo = is_checked ? 2: 1;
        $.Update('/notes/' + note_id , {is_todo: is_todo} , function (saved_note) {
            if ( saved_note ) {
                update_cache('update', saved_note.note_id, saved_note)
            } else {
                alert ("Error updating note!");
            }
        });
    }
    
    function get_date_string(){
        var date = new Date;
        var year = date.getFullYear();
        
        var month = date.getMonth()+1;
        if (month < 10) month = "0" + month;

        var day = date.getDate();
        if (day < 10) day = "0" + day;
        
        return  year + "-" + month + "-" + day;
    }
    
    function get_datetime_string() {
        var date = new Date;
        
        var hours = date.getHours();
        if (hours < 10) hours = "0" + hours;
        
        var minutes = date.getMinutes();
        if (minutes < 10) minutes = "0" + minutes;
        
        return get_date_string() +  " "// + hours + ":" + minutes;
    }
    
    function html_escape(string) {
        return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");    
    }
    
    function update_cache(action, note_id, note_data) {
        for (var i = 0; i < NOTES.length; i++) {
            if ( NOTES[i].note_id == note_id){
                if (action == 'update') {
                    NOTES[i]= note_data   
                } else if (action == 'delete') {
                    NOTES.splice( i, 1 );
                }                                 
                break;
            }
        }
    }
    
    $.fn.fastnotes  = function() {JNotes.dialog("open")};
    return JNotes;
};


}(jQuery));
