package FastNotes::Controller::Notes;

use strict;
use warnings;
use v5.10;
use base 'Mojolicious::Controller';

sub index {
    my $self = shift;

    my $notes = FastNotes::Model::Note->select( {
        user_id => $self->session('user_id')
    } )->hashes;

    $self->render(json => $notes);
}

sub create {
    my $self = shift;

    my $note_id = FastNotes::Model::Note->insert({
        %{$self->req->json},
        user_id => $self->session('user_id'),
        date    => time()
    });

    $self->render(
        json   => scalar FastNotes::Model::Note->select( { note_id => $note_id } )->hash,
        status => 201
    );
}

sub update {
    my $self = shift;
    my %where = (
        user_id => $self->session('user_id'),
        note_id => $self->param('id')
    );

    FastNotes::Model::Note->update( $self->req->json , \%where);

    $self->render(json => FastNotes::Model::Note->select(\%where)->hash );
}

sub delete {
    my $self = shift;

    FastNotes::Model::Note->delete( {
        user_id => $self->session('user_id'),
        note_id => $self->param('id')
    } );

    $self->render(json => 1);
}

1;
