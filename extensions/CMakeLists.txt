cmake_minimum_required(VERSION 3.18)

project(extensions)

set(ENABLE_ICONV OFF CACHE BOOL "Libiconv is not needed.")
add_subdirectory(utils)
include_directories("${CMAKE_CURRENT_SOURCE_DIR}/utils")

add_subdirectory(thumbnail)
