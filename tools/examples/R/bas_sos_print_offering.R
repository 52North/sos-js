#!/usr/bin/Rscript

library(sos4R);

sos <- SOS(url = 'http://pdcdev:8080/52nSOSv3.5.0/sos');

# Get a particular offering from those offered by this SOS.  In this case, the
# HalleySynop offering
off <- sosOfferings(sos)[["HalleySynop"]];

# Metadata of an offering
off.id <- sosId(off);
off.name <- sosName(off);

# Metadata of an offering's outputs
off.resultModels <- sosResultModels(off);
off.responseMode <- sosResponseMode(off);
off.responseFormats <- sosResponseFormats(off);

# Metadata of an offering's spatial/temporal extents
off.boundedBy <- sosBoundedBy(off);
off.boundedBy.bbox <- sosBoundedBy(off, bbox=T);
off.time <- sosTime(off);

# N.B.: According to the manual /usr/lib/R/library/sos4R/doc/sos4R.pdf p. 22,
#       the convert option may not work for all services (but the above will)
off.time.converted <- sosTime(off, convert=T);

# Lists of procedures, observed properties & features of interest pertinent to
# this offering.
# A procedure is essentially the sensor.
# An observed property is the measured parameter.
# A feature of interest is either the spatial region that the sensor observes
# or the location of the sensor itself.
off.procedures <- sosProcedures(off);
off.observedProperties <- sosObservedProperties(off);
off.featuresOfInterest <- sosFeaturesOfInterest(off);

off.id;
off.name;
off.resultModels;
off.responseMode;
off.responseFormats;
off.boundedBy;
off.boundedBy.bbox;
off.time;
off.time.converted;
off.procedures;
off.observedProperties;
off.featuresOfInterest;

