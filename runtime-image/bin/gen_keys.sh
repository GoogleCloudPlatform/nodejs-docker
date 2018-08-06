#!/bin/bash

# This generates the KEYS keyring file with the Node.js release team's gpg
# keys.

set -e

ColinIhrig=94AE36675C464D64BAFA68DD7434390BDBE9B9C5
EvanLucas=B9AE9905FFD7803F25714661B63B535A4C206CA9
GibsonFahnestock=77984A986EBC2AA786BC0F66B01FBB92821C587A
JamesMSnell=71DCFD284A79C3B38668286BC97EC7A07EDE3FC1
JeremiahSenkpiel=FD3A5288F042B6850C66B31F09FE44734EB7990E
MichaelZasso=8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600
MylesBorins=C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8
RodVagg=DD8F2338BAE7501E3DD5AC78C273792F7D83545D
ChrisDickinson=9554F04D7259F04124DE6B476D5A82AC7E37093B
IsaacZSchlueter=93C7E9E91B49E432C2F75674B0A78B0A6C481CF6
ItaloACasas=56730D5401028683275BD23C23EFEFE93C4CFFFE
JulienGilli=114F43EE0176B71C7BC219DD50A3051F888C628D
TimothyJFontaine=7937DFD2AB06298B2293C3187D33FF9D0246406D

keylist="${ColinIhrig} ${EvanLucas} ${GibsonFahnestock} ${JamesMSnell} ${JeremiahSenkpiel} ${MichaelZasso} ${MylesBorins} ${RodVagg} ${ChrisDickinson} ${IsaacZSchlueter} ${ItaloACasas} ${JulienGilli} ${TimothyJFontaine}"

for key in ${keylist} ; do
  gpg2 --keyserver pool.sks-keyservers.net --recv-keys ${key}
done

gpg2 --armor --output=contents/KEYS --export ${keylist}
