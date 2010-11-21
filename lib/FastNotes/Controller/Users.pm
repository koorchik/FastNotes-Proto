package FastNotes::Controller::Users;

use strict;
use warnings;
use v5.10;

use base 'Mojolicious::Controller';

sub create {
    my $self = shift;

    my $login     = $self->param('login');
    my $password  = $self->param('password');
    my $password2 = $self->param('password2');
    my $email     = $self->param('email');

    # Validation
    my $err_msg;
CHECK: {

        unless ( $login && $password && $password2 && $email ) {
            $err_msg = 'Please, fill all fields!';
            last CHECK;
        }

        my $user = FastNotes::Model::User->select({login => $login})->hash();

        if ( $user->{user_id} ) {
            $err_msg = 'User with such login already exists!';
            last CHECK;
        }

        if ( $password ne $password2 ) {
            $err_msg = 'Passwords do not coincide!';
            last CHECK;
        }

        unless ( $email =~ /^[a-z0-9.-]+\@[a-z0-9.-]+$/i ) {
            $err_msg = 'Wrong email address!';
            last CHECK;
        }

    }

    # Show error
    if ($err_msg) {
        $self->flash(
            error        => $err_msg,
            login        => $login,
            email        => $email,
        )->redirect_to('users_create_form');

        return;
    }

    # Save User
    my %user = (
        login    => $login,
        password => $password,
        email    => $email
    );

    my $user_id = FastNotes::Model::User->insert(\%user);

    # Login User
    $self->session(
        user_id => $user_id,
        login   => $login
    )->redirect_to('users_show') if $user_id #TODO ;
}

1;

