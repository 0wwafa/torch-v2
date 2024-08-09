#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#include <limits.h>
#endif

int main(int argc, char *argv[]) {
    // Get the path of the current executable
    char exePath[1024];
#ifdef _WIN32
    GetModuleFileName(NULL, exePath, sizeof(exePath));
#else
    ssize_t count = readlink("/proc/self/exe", exePath, sizeof(exePath) - 1);
    if (count != -1) {
        exePath[count] = '\0';
    } else {
        perror("readlink");
        return 1;
    }
#endif

    // Remove the executable name from the path to get the directory
    char *lastSlash = strrchr(exePath, '/');
#ifdef _WIN32
    if (!lastSlash) {
        lastSlash = strrchr(exePath, '\\');
    }
#endif
    char exeName[256];
    if (lastSlash) {
        strcpy(exeName, lastSlash + 1);
        *lastSlash = '\0';
    } else {
        strcpy(exeName, exePath);
    }

    // Remove the extension from the executable name
    char *dot = strrchr(exeName, '.');
    if (dot) {
        *dot = '\0';
    }

    // Declare the command variable
    char command[2048];

    // Construct the command string with the correct path separator
#ifdef _WIN32
    snprintf(command, sizeof(command), "node %s\\%s.js", exePath, exeName);
#else
    snprintf(command, sizeof(command), "node %s/%s.js", exePath, exeName);
#endif
    for (int i = 1; i < argc; i++) {
        strcat(command, " ");
        strcat(command, argv[i]);
    }

    // Open log.txt in append mode
    /*
    FILE *logFile = fopen("log.txt", "a");
    if (logFile == NULL) {
        perror("fopen");
        return 1;
    }
    fprintf(logFile, "%s\n", command);
    fclose(logFile);
    */
    
    // Execute the command
    int result = system(command);
    if (result == -1) {
        perror("system");
        return 1;
    }

    return 0;
}
