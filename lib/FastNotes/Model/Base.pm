package FastNotes::Model::Base;
use strict;
use warnings;
use v5.10;
use base qw/Mojo::Base/;

#### Class Methods ####

sub select {
    my $class = shift;
 
    FastNotes::Model->db->select($class->table_name, '*', @_);
}

sub insert {
    my $class = shift;
    my $db = FastNotes::Model->db;
    $db->insert($class->table_name, @_)   or die $db->error();
    $db->last_insert_id('','','','')  or die $db->error();
}

sub update {
    my $class = shift;
    my $db = FastNotes::Model->db;
    $db->update($class->table_name, @_) or die $db->error();
}

sub delete {
    my $class = shift;
    my $db = FastNotes::Model->db;
    $db->delete($class->table_name, @_) or die $db->error();
}

1;
__END__
