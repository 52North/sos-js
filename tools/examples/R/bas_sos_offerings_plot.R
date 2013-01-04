#!/usr/bin/Rscript

library(sos4R);
library(maps);
library(mapdata);
library(maptools);
library(rgdal);

sos <- SOS(url = 'http://pdcdev:8080/52nSOSv3.5.0/sos');

# pdf(file="bas-sos-offerings.pdf", width=12, height=9);
png(file="bas-sos-offerings.png", width=800, height=600);

data(worldHiresMapEnv);
crs <- sosGetCRS(sos);
worldHigh <- pruneMap(map(database="worldHires", region=c("Antarctica"), plot=FALSE));
worldHigh.lines <- map2SpatialLines(worldHigh, proj4string=crs);

plot(worldHigh.lines, col="grey50");
plot(sos, add=TRUE, lwd=3, col="red", cex=4);
title(main=paste("Offerings by '", sosTitle(sos), "'", sep=""), sub=toString(names(sosOfferings(sos))));

dev.off();

