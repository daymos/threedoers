import struct


class STLStats:
    """Migration from STLStats.php

    To work with CLI.
    """

    def __init__(self, file_, size, binary=True, density=1.04):  # Default material density. ABS plastic : 1.04gm/cc
        """Requires the size of content, because we are working with file like objects"""
        self.file = file_
        self.flag = False
        self.density = density
        self.triangles_count = 0
        self.size = size
        self.binary = binary
        self.volume = 0
        if not self.binary:
            self._process_ascii()

    # 1. Public Functions

    def get_volume(self, unit):
        """
        Returns the calculated Volume (cc) of the 3D object represented in the binary STL.
        If unit is "cm" then returns volume in cubic cm, but If $unit is "inch" then returns volume in cubic inches.
        """
        if not self.flag:  # boolean flag to minimize repeated volume computation overhead
            self._calculate_volume()
            self.flag = True

        if unit == 'cm':
            return self.volume/1000
        else:
            return self._inch3(self.volume/1000)

    def get_weight(self):
        """Returns the calculated Weight (gm) of the 3D object represented in the binary STL."""
        return self._calculate_weight(self.get_volume('cm'))

    # 2. Infrastructure Functions

    def _calculate_volume(self):
        """
        Invokes the binary file reader to read the header,
        serially reads all the normal vector and triangular co-ordinates,
        calls the math function to calculate signed tetrahedral volumes for each trangle,
        sums up these volumes to give the final volume of the 3D object represented in the .stl binary file.
        """
        self.volume = 0
        if self.binary:
            self._read_header()
            self.triangles_count = self._read_triangles_count()
            while self.file.tell() < self.size:
                self.volume += self._read_triangle()

            self.file.seek(0)  # after calculation we seek to 0, maybe user needs use it
        else:
            while len(self.triangles_data) > 0:
                self.volume += self._read_triangle_ascii()
                self.triangles_count += 1

        self.volume = abs(self.volume)

    def _unpack(self, fmt, size):
        """
        Wrapper around PHP's unpack() function which decodes binary numerical data to float, int, etc types.
        sig specifies the type of data (i.e. integer, float, etc)
        l specifies number of bytes to read.
        """
        data = self.file.read(size)
        return struct.unpack(fmt, data)

    # 3. Binary read functions

    def _read_header(self):
        """
        Reads the binary header field in the STL file and offsets the file reader pointer to
        enable reading the triangle-normal data.
        """
        return self.file.seek(self.file.tell() + 80)

    def _read_triangles_count(self):
        """
        Reads the binary field in the STL file which specifies the total number of triangles
        and returns that integer.
        """
        return self._unpack('I', 4)[0]

    def _read_triangle(self):
        """
        Reads a triangle data from the binary STL and returns its signed volume.
        A binary STL is a representation of a 3D object as a collection of triangles and their normal vectors.
        Its specifiction can be found here:
        http://en.wikipedia.org/wiki/STL_(file_format)%23Binary_STL
        This function reads the bytes of the binary STL file, decodes the data to give float XYZ co-ordinates of the trinaglular
        vertices and the normal vector for a triangle.
        """
        self.file.seek(self.file.tell() + 12)  # skiping this
        triangle = [self._unpack('3f', 12), self._unpack('3f', 12), self._unpack('3f', 12)]
        self.file.seek(self.file.tell() + 2)  # skiping this
        return self._signed_volume_triangle(*triangle)

    # 4. Math Functions

    def _signed_volume_triangle(self, p1, p2, p3):
        """
        Returns the signed volume of a triangle as determined by its 3D, XYZ co-ordinates.
        The var $pn contains an array(x,y,z).
        """
        v321 = p3[0] * p2[1] * p1[2]
        v231 = p2[0] * p3[1] * p1[2]
        v312 = p3[0] * p1[1] * p2[2]
        v132 = p1[0] * p3[1] * p2[2]
        v213 = p2[0] * p1[1] * p3[2]
        v123 = p1[0] * p2[1] * p3[2]
        return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123)

    def _inch3(self, v):
        """Converts the volume specified in cubic cm to cubic inches."""
        return v * 0.0610237441

    def _calculate_weight(self, v):
        return v * self.density

    # 5. ASCII handlers
    def _process_ascii(self):
        import re
        pattern = re.compile(r'''facet\snormal\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+outer\s+loop\s+vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+endloop\s+endfacet''')
        self.triangles_data = []
        for match in pattern.finditer(self.file.read()):
            groups = match.groups()
            self.triangles_data.append([
                (float(groups[6]), float(groups[8]), float(groups[10])),
                (float(groups[12]), float(groups[14]), float(groups[16])),
                (float(groups[18]), float(groups[20]), float(groups[22])),
            ])

    def _read_triangle_ascii(self):
        """Reads a triangle data from the ascii STL and returns its signed volume."""
        return self._signed_volume_triangle(*self.triangles_data.pop())


if __name__ == '__main__':
    import os

    from optparse import OptionParser

    usage = "usage: %prog [options] filename"

    parser = OptionParser(usage=usage)

    parser.add_option("-d", "--density", dest="density", default=1.04, type="float",
                      help="Density for object", metavar="DENSITY")

    parser.add_option("-u", "--unit", dest="unit", default='cm',
                      help="unit to measure for object", metavar="UNIT")

    options, args = parser.parse_args()

    if len(args) != 1:
        parser.print_help()
        exit(-1)

    _file = open(args[0])
    size = os.path.getsize(args[0])
    binary = not 'facet' in _file.read(50)
    _file.seek(0)

    s = STLStats(_file, size, binary, options.density)
    print '{ "volume": %s, "weight": %s, "density": %s, "unit": "%s"}' % (s.get_volume(options.unit), s.get_weight(), options.density, options.unit)

    _file.close()
