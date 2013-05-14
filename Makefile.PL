#!/usr/bin/env perl
use ExtUtils::MakeMaker;

WriteMakefile(
  PREREQ_PM => {
      'Mojolicious'   => 3.97,
      'DBIx::Simple'  => 0,
      'SQL::Abstract' => 0,
      'DBD::SQLite'   => 0,
  }
);
