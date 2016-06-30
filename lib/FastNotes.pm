package FastNotes;

use strict;
use warnings;
use Mojo::Base 'Mojolicious';
use FastNotes::Model;



# This method will run once at server start
sub startup {
    my $self = shift;

    $self->secrets(['SomethingVerySecret']);
    $self->mode('development');
    $self->sessions->default_expiration(3600*24*7);

    my $config = $self->plugin( 'JSONConfig' => { file=>'fastnotes.json' } );

    my $r = $self->routes;
    $r->namespaces(['FastNotes::Controller']);

    $r->route('/')                   ->to('auths#create_form')->name('auths_create_form');
    $r->route('/login')              ->to('auths#create')     ->name('auths_create');
    $r->route('/logout')             ->to('auths#delete')     ->name('auths_delete');
    $r->route('/signup')->via('get') ->to('users#create_form')->name('users_create_form');
    $r->route('/signup')->via('post')->to('users#create')     ->name('users_create');
    $r->route('/main')  ->via('get') ->to('users#show')       ->name('users_show');

    my $rn = $r->under('/notes')->to('auths#check');
    $rn->route                       ->via('get')   ->to('notes#index') ->name('notes_show');
    $rn->route                       ->via('post')  ->to('notes#create')->name('notes_create');
    $rn->route('/:id', id => qr/\d+/)->via('put')   ->to('notes#update')->name('notes_update');
    $rn->route('/:id', id => qr/\d+/)->via('delete')->to('notes#delete')->name('notes_delete');

    $r->route('/help')   ->to( cb => sub{ shift->render( template=>'help', format=>'html' ) } );

    # Init Model
    FastNotes::Model->init( $config->{db} || {
        dsn      => 'dbi:SQLite:dbname=' . $self->home->rel_dir('storage') . '/fastnotes.db',
        user     => '',
        password =>''
    });

}

1;
