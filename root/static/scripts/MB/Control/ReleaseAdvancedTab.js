/*
   This file is part of MusicBrainz, the open internet music database.
   Copyright (C) 2010 MetaBrainz Foundation

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.

*/

// FIXME: move the following to constants?
MB.Control._disabled_colour = '#AAA';

MB.Control.ReleaseTrack = function (track, artistcredit) {
    var self = MB.Object ();

    self.row = track;
    self.acrow = artistcredit;

    self.position = track.find ('td.position input');
    self.title = track.find ('td.title input.track-name');
    self.id = track.find ('td.title input[type=hidden]');
    self.preview = track.find ('td.artist input.artist-credit-preview');
    self.length = track.find ('td.length input');
    self.deleted = track.find ('td.delete input');

    /**
     * render enters the supplied data into the form fields for this track.
     */
    var render = function (data) {
        self.position.val (data.position);
        self.title.val (data.name);
        self.length.val (data.length);
        self.deleted.val (data.deleted);
        if (data.artist_credit)
        {
            self.artist_credit.render (data.artist_credit);
        }

        if (data.deleted)
        {
            self.row.addClass ('deleted');
        }
        else
        {
            self.row.removeClass ('deleted');
        }

        return self;
    };

    /**
     * toggleDelete (un)marks the track for deletion. Provide a boolean to delete
     * or undelete a track, or leave it empty to toggle.
     */
    var toggleDelete = function (value) {
        var deleted = (value === undefined) ? !parseInt (self.deleted.val ()) : value;
        if (deleted)
        {
            self.deleted.val('1');
            self.row.addClass('deleted');
        }
        else
        {
            self.deleted.val ('0');
            self.row.removeClass('deleted');
        }
        var trackpos = 1;

        self.row.closest ('tbody').find ('tr.track').each (
            function (idx, elem) {
                $(elem).find('input.pos').val (trackpos);
                if (! $(elem).hasClass ('deleted'))
                {
                    trackpos += 1;
                }
            }
        );
    };

    /**
     * isDeleted returns true if this track is marked for deletion.
     */
    var isDeleted = function () {
        return self.deleted.val () === '1';
    };


    /**
     * remove removes the associated inputs and table rows.
     */
    var remove = function () {
        self.row.remove ();
        self.acrow.remove ();
    };
    
    self.render = render;
    self.toggleDelete = toggleDelete;
    self.isDeleted = isDeleted;
    self.remove = remove;

    self.row.find ("a[href=#remove_track]").click (function () { self.toggleDelete() });
    self.artist_credit = MB.Control.ArtistCreditRow (self.row, self.acrow);

    if (self.isDeleted ())
    {
        self.row.addClass('deleted');
    }

    return self;
};

MB.Control.ReleaseDisc = function (disc, parent) {
    var self = MB.Object ();

    self.fieldset = disc;
    self.parent = parent;

    /**
     * fullTitle returns the disc title prefixed with 'Disc #: '.  Or just
     * 'Disc #' if the disc doesn't have a title.
     */
    var fullTitle = function () {
        var title = '';
        if (!self.title.hasClass ('jquery_placeholder'))
        {
            title = self.title.val ();
        }

        return 'Disc ' + self.position () + (title ? ': '+title : '');
    };

    /**
     * addTrack renders new tr.track and tr.track-artist-credit rows in the
     * tracklist table.  It copies the release artistcredit.
     */
    var addTrack = function (event) {
        var trackno = self.tracks.length;

        var previous = null;
        if (self.table.find ('tr.track').length)
        {
            previous = self.table.find ('tr.track').last ();
        }

        var row = self.template.find ('tr.track').clone ();
        var acrow = self.template.find ('tr.track-artist-credit').clone ();

        self.table.append (row).append (acrow);

        var trk = MB.Control.ReleaseTrack (row, acrow);
        trk.position.val (trackno + 1);

        self.updateArtistColumn ();

        self.tracks.push (trk);
        self.sorted_tracks.push (trk);

        /* if the release artist is VA, clear out the track artist. */
        if (trk.artist_credit.isVariousArtists ())
        {
            trk.artist_credit.clear ();
        }
    };

    /**
     * getTrack merely returns the track from self.tracks if the track
     * exists.  If the track does not exist yet getTrack will
     * repeatedly call addTrack until it does.
     */
    var getTrack = function (idx) {
        while (idx >= self.tracks.length)
        {
            self.addTrack ();
        }

        return self.tracks[idx];
    };

    /**
     * removeTracks removes all table rows for unused track positions.  It expects
     * the position of the last used track as input.
     */
    var removeTracks = function (lastused) {
        while (lastused + 1 < self.tracks.length)
        {
            self.tracks.pop ().remove ();
        }

        if (lastused === 0)
        {
            self.sorted_tracks = [];
        }
    };

    /**
     * sort sorts all the table rows by the 'position' input.
     */
    var sort = function () {
        self.sorted_tracks = [];
        $.each (self.tracks, function (idx, item) { self.sorted_tracks.push (item); });

        self.sorted_tracks.sort (function (a, b) {
            return parseInt (a.position.val ()) - parseInt (b.position.val ());
        });

        $.each (self.sorted_tracks, function (idx, track) {
            if (idx)
            {
                track.row.insertAfter (self.sorted_tracks[idx-1].acrow);
                track.acrow.insertAfter (track.row);
            }
        });
    };

    /**
     * updateArtistColumn makes sure the enabled/disabled state of each of the artist
     * inputs matches the checkbox at the top of the column.
     */
    var updateArtistColumn = function () {
        var artists = self.table.find ('tr.track td.artist input');
        if (self.artist_column_checkbox.filter(':checked').val ())
        {
            artists.removeAttr('disabled').css('color', 'inherit');
        }
        else
        {
            artists.attr('disabled','disabled').css('color', MB.Control._disabled_colour);
            MB.Control.artist_credit_hide_rows (self.table);
        }
    };

    var registerBasic = function (basic) {
        self.basic = basic;
    };

    /* 'up' is visual, so the disc position decreases. */
    var moveUp = function (event) {
        self.parent.moveDisc (self, -1);

        event.preventDefault ();
    };

    /* 'down' is visual, so the disc position increases. */
    var moveDown = function (event) {
        self.parent.moveDisc (self, +1);

        event.preventDefault ();
    };

    var position = function (val) {
        if (val)
        {
            self.position_input.val (val);
            self.fieldset.find ('span.discnum').text (val);
            self.basic.basicdisc.find ('span.discnum').text (val);
            return val;
        }

        return parseInt (self.position_input.val ());
    };

    var submit = function () {
        if (self.expanded)
        {
            self.edits.saveEdits (self.tracklist, self.tracks);
        }
    };

    var collapse = function (chained) {
        self.expanded = false;
        self.edits.saveEdits (self.tracklist, self.tracks);

        /* Free up memory used for the tracklist.
           FIXME: shouldn't do this immediatly, but only after N other discs
           have been opened. */
        self.tracklist = null;

        self.table.hide ();
        self.removeTracks (0);
        self.fieldset.removeClass ('expanded');
        self.expand_icon.find ('span.ui-icon')
            .removeClass ('ui-icon-triangle-1-s')
            .addClass ('ui-icon-triangle-1-w');

        if (!chained)
        {
            self.basic.collapse (true);
        }
    };

    var expand = function (chained) {
        self.expanded = true;
        var data = self.edits.loadEdits ();

        var use_data = function (data) {
            self.loadTracklist (data); 
            if (chained) { 
                self.basic.loadTracklist (data);
            }
        };

        if (data)
        {
            use_data (data);
        }
        else if (!self.tracklist)
        {
            /* FIXME: ignore result if the disc has been collapsed in 
               the meantime.  --warp. */
            var tracklist_id = self.basic.tracklist_id.val ();
            if (tracklist_id)
            {
                $.getJSON ('/ws/js/tracklist/' + tracklist_id, {}, use_data);
            }
            else
            {
                use_data ([]);
            }
        }

        self.table.show ();
        self.fieldset.addClass ('expanded');
        self.expand_icon.find ('span.ui-icon')
            .removeClass ('ui-icon-triangle-1-w')
            .addClass ('ui-icon-triangle-1-s');

        if (!chained)
        {
            self.basic.expand (true);
        }
    };

    var loadTracklist = function (data) {

        if (!data)
        {
            data = [];
        }

        self.tracklist = data;

        self.removeTracks (data.length);

        $.each (data, function (idx, trk) {
            if (!trk.hasOwnProperty ('position'))
            {
                trk.position = idx + 1;
            }

            if (!trk.hasOwnProperty ('deleted'))
            {
                trk.deleted = 0;
            }
            self.getTrack (idx).render (trk);
        });

        self.sort ();
    };

    self.table = self.fieldset.find ('table.medium');
    self.artist_column_checkbox = self.table.find ('th.artist input');

    self.number = parseInt (self.fieldset.attr ('id').match ('mediums\.([0-9]+)\.advanced-disc')[1]);

    self.expanded = false;
    self.tracklist = null;
    self.tracks = [];
    self.sorted_tracks = [];

    /* the following inputs move between the fieldset and the
     * textareas of the basic view.  Therefore we cannot rely on them
     * being children of self.fieldset, and we need to find them based
     * on their id attribute. */
    self.title = $('#id-mediums\\.'+self.number+'\\.name');
    self.position_input = $('#id-mediums\\.'+self.number+'\\.position');
    self.format_id = $('#id-mediums\\.'+self.number+'\\.format_id');

    self.edits = MB.Control.ReleaseEdits ($('#mediums\\.'+self.number+'\\.edits'));

    self.buttons = $('#mediums\\.'+self.number+'\\.buttons');
    self.expand_icon = self.buttons.find ('a.expand.icon');
    self.template = $('table.tracklist-template');

    self.fieldset.find ('table.medium tbody tr.track').each (function (idx, item) {
        self.tracks.push (
            MB.Control.ReleaseTrack ($(item), $(item).next('tr.track-artist-credit'))
        );
    });

    self.fullTitle = fullTitle;
    self.addTrack = addTrack;
    self.getTrack = getTrack;
    self.removeTracks = removeTracks;
    self.sort = sort;
    self.updateArtistColumn = updateArtistColumn;
    self.registerBasic = registerBasic;
    self.moveDown = moveDown;
    self.moveUp = moveUp;
    self.position = position;
    self.submit = submit;
    self.collapse = collapse;
    self.expand = expand;
    self.loadTracklist = loadTracklist;

    self.buttons.find ('a[href=#discdown]').click (self.moveDown);
    self.buttons.find ('a[href=#discup]').click (self.moveUp);

    self.expand_icon.click (function (event) {

        if (self.table.is (':visible'))
        {
            self.collapse ();
        }
        else
        {
            self.expand ();
        }

        event.preventDefault ();
        return false;
    });

    $("#mediums\\."+self.number+"\\.add_track").click(self.addTrack);
    self.artist_column_checkbox.bind ('change', self.updateArtistColumn);

    self.updateArtistColumn ();
    self.sort ();

    return self;
};

MB.Control.ReleaseUseTracklist = function (parent) {
    var self = MB.Object ();

    self.parent = parent;
    self.$fieldset = $('fieldset.use-tracklist');
    self.$release = self.$fieldset.find ('input.tracklist-release');
    self.$artist = self.$fieldset.find ('input.tracklist-artist');
    self.$count = self.$fieldset.find ('input.tracklist-count');
    self.$template = self.$fieldset.find ('.use-tracklist-template');
    self.$pager = self.$fieldset.find ('span.pager-tracklist');

    self.$usetracklist = $('a[href=#use_tracklist]');
    self.$search = $('a[href=#search_tracklist]');
    self.$next = $('a[href=#next_tracklist]');
    self.$prev = $('a[href=#prev_tracklist]');

    var expand = function (event) {

        var $div = $(this).closest('div');
        var $table = $div.find('table');
        var $icon = $div.find ('span.ui-icon');
        var $loading = $div.find('.tracklist-loading');
        var $buttons = $div.find ('div.buttons');
        var tracklist = $div.find ('input.tracklist-id').val ();

        if ($table.is(':visible') || $loading.is(':visible'))
        {
            $icon.removeClass ('ui-icon-triangle-1-s').addClass ('ui-icon-triangle-1-e');
            $div.removeClass ('tracklist-padding');
            $loading.hide ();
            $table.hide ();
            $buttons.hide ();
            self.$pager.hide ();
            
            return;
        }

        $icon.removeClass ('ui-icon-triangle-1-e').addClass ('ui-icon-triangle-1-s');
        $div.addClass ('tracklist-padding');
        $loading.show ();

        $.getJSON ('/ws/js/tracklist/' + tracklist, function (data) {
            $table.find ('tr.track').eq (0).nextAll ().remove ();

            $.each (data, function (idx, item) {
                var tr = $table.find ('tr.track').eq(0).clone ()
                    .appendTo ($table.find ('tbody'));

                tr.find ('td.position').text (idx + 1);
                tr.find ('td.title').text (item.name);
                tr.find ('td.artist').text (item.artist_credit.preview);
                tr.find ('td.length').text (item.length);
                tr.show ();
            });

            $loading.hide ();
            $table.show ();
            $buttons.show ();
        });

    };

    var results = function (data) {

        $.each (data, function (idx, item) {
            if (item.current)
            {
                var pager = MB.utility.template (MB.text.Pager);
                self.total = item.pages;

                self.$pager.text (pager.draw ({ 'page': item.current, 'total': item.pages }));
                return;
            }

            var tl = self.$template.clone ()
                .appendTo (self.$fieldset)
                .removeClass ('use-tracklist-template')
                .addClass ('use-tracklist');

            var format = item.format ? item.format : 'Disc';
            var medium = '(' + format + ' ' + item.position +
                (item.medium ? ': ' + item.medium : '') + ')';

            tl.find ('span.title').text (item.name);
            tl.find ('span.medium').text (medium);
            tl.find ('span.artist').text (item.artist);
            tl.find ('input.tracklist-id').val (item.tracklist_id);
            tl.find ('a.icon').bind ('click.mb', self.expand);
            tl.find ('a[href=#use_this_tracklist]').bind ('click.mb', function (event) {
                self.useTracklist (item.tracklist_id);
            });

            tl.show ();
        });

        self.$fieldset.css ('height', 'auto');
    };

    var search = function (event, direction) {
        var newPage = self.page + direction;
        if (newPage < 1 || newPage > self.total)
        {
            return;
        }

        self.page = newPage;
        var height = $('fieldset.use-tracklist').innerHeight ();
        self.$fieldset.css ('height', height);
        self.$fieldset.find ('div.use-tracklist').remove ();

        var data = {
            q: self.$release.val (),
            artist: self.$artist.val (),
            tracks: self.$count.val (),
            page: self.page,
        };
        $.getJSON ('/ws/js/tracklist', data, self.results);
    };

    var useTracklist = function (id) {

        var ta = self.parent.basic.addDisc ();
        ta.tracklist_id.val (id);
        ta.collapse ();
        ta.expand ();

        self.$fieldset.hide ();
    };

    var onChange = function (event) { self.page = 1; };

    self.page = 1;
    self.total = 1;
    self.expand = expand;
    self.results = results;
    self.useTracklist = useTracklist;

    self.$search.bind ('click.mb', function (event) { search (event, 0); });
    self.$prev.bind ('click.mb', function (event) { search (event, -1); });
    self.$next.bind ('click.mb', function (event) { search (event,  1); });
    self.$usetracklist.bind ('click.mb', function (event) {
        self.$fieldset.toggle ();
    });

    self.$release.bind ('change.mb', onChange);
    self.$artist.bind ('change.mb', onChange);
    self.$count.bind ('change.mb', onChange);

    return self;
};

MB.Control.ReleaseAdvancedTab = function () {
    var self = MB.Object ();

    var addDisc = function () {
        var discs = self.discs.length;
        var lastdisc_bas = $('.basic-disc').last ();
        var lastdisc_adv = $('.advanced-disc').last ();

        var newdisc_bas = lastdisc_bas.clone ().insertAfter (lastdisc_bas);
        var newdisc_adv = lastdisc_adv.clone ().insertAfter (lastdisc_adv);

        newdisc_adv.find ('tbody').empty ();

        var discnum = newdisc_bas.find ("h3").find ('span.discnum');
        discnum.text (discs + 1);

        discnum = newdisc_adv.find ("legend").find ('span.discnum');
        discnum.text (discs + 1);

        var mediumid = new RegExp ("mediums.[0-9]+");
        var update_ids = function (idx, element) {
            var item = $(element);
            if (item.attr ('id'))
            {
                item.attr ('id', item.attr('id').replace(mediumid, "mediums."+discs));
            }
            if (item.attr ('name'))
            {
                item.attr ('name', item.attr('name').replace(mediumid, "mediums."+discs));
            }
        };

        newdisc_bas.find ("*").andSelf ().each (update_ids);
        newdisc_adv.find ("*").andSelf ().each (update_ids);

        /* clear the cloned rowid for this medium and tracklist, so a
         * new medium and tracklist will be created. */
        $("#id-mediums\\."+discs+"\\.id").val('');
        $("#id-mediums\\."+discs+"\\.name").val('');
        $("#id-mediums\\."+discs+"\\.position").val(discs + 1);
        $("#id-mediums\\."+discs+"\\.tracklist_id").val('');
        $('#id-mediums\\.'+discs+'\\.deleted').val('0');
        $('#id-mediums\\.'+discs+'\\.edits').val('');

        newdisc_bas.find ('textarea').empty ();

        var new_disc = MB.Control.ReleaseDisc (newdisc_adv, self);

        self.discs.push (new_disc);

        /* and scroll down to the new position of the 'Add Disc' button if possible. */
        /* FIXME: this hardcodes the fieldset bottom margin, shouldn't do that. */
        var newpos = lastdisc_adv.height () ? lastdisc_adv.height () + 12 : lastdisc_bas.height ();
        $('html').animate({ scrollTop: $('html').scrollTop () + newpos }, 500);

        return new_disc;
    };

    var moveDisc = function (disc, direction) {
        var position = disc.position ();
        var idx = position - 1;

        if (direction < 0 && idx === 0)
            return;

        if (direction > 0 && idx === self.discs.length - 1)
            return;

        var other = self.discs[idx + direction];

        other.position (position)
        disc.position (position + direction)

        self.discs[idx + direction] = disc;
        self.discs[idx] = other;

        if (direction < 0)
        {
            disc.fieldset.insertBefore (other.fieldset);

            /* FIXME: yes, I am aware that the variable names I've chosen 
               here could use a little improvement. --warp. */
            disc.basic.basicdisc.insertBefore (other.basic.basicdisc);
        }
        else
        {
            other.fieldset.insertBefore (disc.fieldset);
            other.basic.basicdisc.insertBefore (disc.basic.basicdisc);
        }
    };

    var submit = function (event) {
        $.each (self.discs, function (idx, disc) {
            disc.submit (event);
        });
    };

    self.tab = $('div.advanced-tracklist');
    self.discs = [];
    self.addDisc = addDisc;
    self.moveDisc = moveDisc;
    self.submit = submit;
    self.basic = null; // set by MB.Control.ReleaseBasicTab.

    self.use_tracklist = MB.Control.ReleaseUseTracklist (self);

    self.tab.find ('fieldset.advanced-disc').each (function (idx, item) {
        self.discs.push (MB.Control.ReleaseDisc ($(item), self));
    });

    $('form.release-editor').bind ('submit', self.submit);

    return self;
};
