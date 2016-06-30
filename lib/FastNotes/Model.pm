package FastNotes::Model;
use strict;
use warnings;
use v5.10;
use DBIx::Simple;
use SQL::Abstract;
use Carp qw/croak/;

use FastNotes::Model::User;
use FastNotes::Model::Note;

my $DB;

sub init {
    my ($class, $config) = @_;
    croak "No dsn was passed!" unless $config && $config->{dsn};

    unless ( $DB ) {
        $DB = DBIx::Simple->connect(@$config{qw/dsn user password/},
            {
                 RaiseError     => 1,
                 sqlite_unicode => 1,
            } )  or die DBIx::Simple->error;

        $DB->abstract = SQL::Abstract->new(
               case          => 'lower',
               logic         => 'and',
               convert       => 'upper'
        );

        unless ( eval {$DB->select('users')} ) { # TODO make better check
            $class->create_db_structure();
        }
    }

    return $DB;
}

sub db {
    return $DB if $DB;
    croak "You should init model first!";
}

sub create_db_structure {
    my $class = shift;

    $class->db->query(
            'CREATE TABLE users (user_id  INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
                                      login    TEXT    NOT NULL UNIQUE,
                                      password TEXT    NOT NULL,
                                      email    TEXT,
                                      jid      TEXT,
                                      gravatar TEXT);'
    );

    $class->db->query(
            'CREATE TABLE notes (note_id INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
                                      user_id INTEGER NOT NULL
                                              CONSTRAINT fk_user_id
                                              REFERENCES user(user_id)
                                              ON DELETE RESTRICT,
                                      is_important INTEGER NOT NULL DEFAULT(0),
                                      is_todo      INTEGER NOT NULL DEFAULT(0),
                                      is_deleted   INTEGER NOT NULL DEFAULT(0),
                                      text     TEXT NOT NULL,
                                      date INTEGER NOT NULL);'
    );

    $class->db->query(
        "INSERT INTO users(login, password) VALUES('user', 'password');"
    );
}

1;
